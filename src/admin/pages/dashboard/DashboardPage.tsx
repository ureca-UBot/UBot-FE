import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiRequestError } from "../../../shared/api/client";
import { faqMonitoringApi } from "../../dashboard/api/faqMonitoringApi";
import { Pagination } from "../../faq/components/Pagination";
import type {
  FaqDetailResponse,
  FaqDuplicateCandidate,
  FaqImprovementResponse,
  FaqImprovementType,
  FaqMonitoringResponse,
  FaqSimilarityItem,
  FaqUsageItem,
} from "../../dashboard/types/faqMonitoring";

type RankingType = "top" | "low";
type RankingIntent = "all" | "userData" | "storeData";

const improvementTypeLabel = {
  LOW_RAG_QUALITY: "검색품질",
  DUPLICATE_SUSPECTED: "중복의심",
  LOW_USAGE: "활용도",
};
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const defaultEndDate = toInputDate(new Date());
const defaultStartDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toInputDate(date);
})();
const improvementPageSize = 5;
const improvementTypes: FaqImprovementType[] = [
  "LOW_RAG_QUALITY",
  "LOW_USAGE",
  "DUPLICATE_SUSPECTED",
];
const toAsOfDateTime = (date: Date) =>
  `${toInputDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;

function DraggableRankStrip({
  metric,
  items,
  onSelect,
}: {
  metric: "usage" | "similarity";
  items: (FaqUsageItem | FaqSimilarityItem)[];
  onSelect: (faqId: number) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const [dragging, setDragging] = useState(false);
  const begin = (clientY: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    startX.current = clientY;
    startScroll.current = strip.scrollTop;
    setDragging(true);
  };
  const move = (clientY: number) => {
    const strip = stripRef.current;
    if (!strip || !dragging) return;
    strip.scrollTop = startScroll.current - (clientY - startX.current);
  };
  const metricLabel = metric === "usage" ? "FAQ 사용량" : "평균 Similarity";
  return (
    <div className="faq-dashboard-strip-shell">
      <div className="faq-dashboard-strip-label">
        <b>FAQ 데이터</b>
        <span>상하로 드래그하여 20개 항목 보기</span>
      </div>
      <div
        className={`faq-dashboard-rank-strip${dragging ? " is-dragging" : ""}`}
        onMouseDown={(event) => begin(event.clientY)}
        onMouseMove={(event) => move(event.clientY)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={(event) => begin(event.touches[0].clientY)}
        onTouchMove={(event) => move(event.touches[0].clientY)}
        onTouchEnd={() => setDragging(false)}
        ref={stripRef}
      >
        {items.map((item, index) => {
          const value =
            "count" in item
              ? item.count.toLocaleString("ko-KR")
              : item.averageSimilarity.toFixed(3);
          return (
            <article
              className="faq-dashboard-rank-card"
              key={item.faqId}
              onClick={() => onSelect(item.faqId)}
            >
              <span>TOP {index + 1}</span>
              <div>
                <small>FAQ ID</small>
                <b>{item.faqId}</b>
              </div>
              <div>
                <small>의도</small>
                <b>{item.intent}</b>
              </div>
              <div className="faq-dashboard-rank-card__question">
                <small>FAQ 질문</small>
                <b>{item.question || "-"}</b>
              </div>
              <div>
                <small>{metricLabel}</small>
                <b>{value}</b>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DetailUsageChart({ detail }: { detail: FaqDetailResponse | null }) {
  const formatLabel = (timestamp: string) => {
    if (
      detail?.usageTrend.period === "SIX_HOURS" ||
      detail?.usageTrend.period === "DAY"
    )
      return timestamp.slice(11, 16);
    if (detail?.usageTrend.period === "MONTH")
      return timestamp.slice(5, 10).replace("-", "/");
    if (detail?.usageTrend.period === "YEAR")
      return `${Number(timestamp.slice(5, 7))}월`;
    return "";
  };
  const data = (detail?.usageTrend.points ?? []).map((point) => ({
    label: formatLabel(point.bucketStart),
    usage: point.count,
  }));
  return (
    <div className="faq-dashboard-trend">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 3, left: -12 }}
        >
          <CartesianGrid
            stroke="#e3ebf6"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            minTickGap={18}
            tick={{ fill: "#8290a6", fontSize: 9 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "#8290a6", fontSize: 9 }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString("ko-KR")}회`,
              "사용량",
            ]}
          />
          <Line
            dataKey="usage"
            dot={false}
            stroke="#1678e9"
            strokeWidth={2.4}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function UsageChartFrame({ items }: { items: FaqUsageItem[] }) {
  const data = items.map((item) => ({
    faqId: String(item.faqId),
    question: item.question,
    usage: item.count,
  }));
  return (
    <div className="faq-dashboard-usage-chart">
      <div className="faq-dashboard-chart__heading">
        <div>
          <strong>TOP 1 ~ TOP 20 사용량</strong>
          <span>FAQ별 검색 결과 포함 횟수</span>
        </div>
        <div className="faq-dashboard-chart__legend">
          <i />
          <span>사용량</span>
        </div>
      </div>
      <div className="faq-dashboard-recharts">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 6, bottom: 2, left: -12 }}
          >
            <CartesianGrid
              stroke="#e5ecf6"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="faqId"
              interval={0}
              tick={{ fill: "#5d6c84", fontSize: 9 }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#8491a5", fontSize: 9 }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgb(37 136 239 / 8%)" }}
              formatter={(value) => [
                `${Number(value).toLocaleString("ko-KR")}회`,
                "사용량",
              ]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload.question ?? ""
              }
            />
            <Bar
              dataKey="usage"
              fill="#2588ef"
              maxBarSize={22}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SimilarityChartFrame({ items }: { items: FaqSimilarityItem[] }) {
  const data = items.map((item) => ({
    faqId: String(item.faqId),
    question: item.question,
    similarity: item.averageSimilarity,
  }));
  return (
    <div className="faq-dashboard-similarity-chart">
      <div className="faq-dashboard-chart__heading">
        <div>
          <strong>FAQ 평균 Similarity</strong>
          <span>FAQ별 평균 유사도 비교</span>
        </div>
        <div className="faq-dashboard-chart__legend faq-dashboard-chart__legend--green">
          <i />
          <span>평균 Similarity</span>
        </div>
      </div>
      <div className="faq-dashboard-recharts">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 6, bottom: 2, left: -12 }}
          >
            <CartesianGrid
              stroke="#e5ecf6"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="faqId"
              interval={0}
              tick={{ fill: "#5d6c84", fontSize: 9 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: "#8491a5", fontSize: 9 }}
              tickCount={3}
              tickFormatter={(value) => Number(value).toFixed(1)}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgb(30 176 132 / 8%)" }}
              formatter={(value) => [
                Number(value).toFixed(3),
                "평균 Similarity",
              ]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload.question ?? ""
              }
            />
            <Bar
              dataKey="similarity"
              fill="#1eb084"
              maxBarSize={22}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [usageType, setUsageType] = useState<RankingType>("top");
  const [similarityType, setSimilarityType] = useState<RankingType>("top");
  const [usageIntent, setUsageIntent] = useState<RankingIntent>("all");
  const [similarityIntent, setSimilarityIntent] =
    useState<RankingIntent>("all");
  const [periodMode, setPeriodMode] = useState<"7d" | "30d" | "custom">("30d");
  const [detailRange, setDetailRange] = useState<
    "6h" | "today" | "month" | "year"
  >("month");
  const [detailAsOf, setDetailAsOf] = useState(() => new Date());
  const [selectedImprovementFaqId, setSelectedImprovementFaqId] = useState<
    number | null
  >(null);
  const [improvementPage, setImprovementPage] = useState(0);
  const [improvementResponse, setImprovementResponse] =
    useState<FaqImprovementResponse | null>(null);
  const [selectedImprovementTypes, setSelectedImprovementTypes] = useState<
    FaqImprovementType[]
  >([]);
  const [isImprovementLoading, setIsImprovementLoading] = useState(true);
  const [improvementError, setImprovementError] = useState<string | null>(null);
  const improvementRequestId = useRef(0);
  const [duplicateCandidates, setDuplicateCandidates] = useState<{
    key: string;
    items: FaqDuplicateCandidate[];
  } | null>(null);
  const [duplicateRequestError, setDuplicateRequestError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const duplicateRequestId = useRef(0);
  const duplicateScrollRef = useRef<HTMLDivElement>(null);
  const duplicateDragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    scrollLeft: number;
    scrollTop: number;
    dragging: boolean;
  } | null>(null);
  const suppressDuplicateClickRef = useRef(false);
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false);
  const [monitoringData, setMonitoringData] =
    useState<FaqMonitoringResponse | null>(null);
  const [detailFaqId, setDetailFaqId] = useState("");
  const [faqDetail, setFaqDetail] = useState<FaqDetailResponse | null>(null);
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const detailRequestId = useRef(0);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [isMonitoringLoading, setIsMonitoringLoading] = useState(false);
  const hasLoadedInitialMonitoring = useRef(false);
  const setRecentPeriod = (days: 7 | 30) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - days);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
    setPeriodMode(`${days}d` as "7d" | "30d");
  };
  const loadMonitoringData = useCallback(
    async (rangeStart: string, rangeEnd: string) => {
      if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) return;
      setIsMonitoringLoading(true);
      try {
        setMonitoringData(
          await faqMonitoringApi.getMonitoringData({
            startDate: rangeStart,
            endDate: rangeEnd,
          }),
        );
      } catch (error) {
        console.error("FAQ 모니터링 데이터를 불러오지 못했습니다.", error);
      } finally {
        setIsMonitoringLoading(false);
      }
    },
    [],
  );
  useEffect(() => {
    if (hasLoadedInitialMonitoring.current) return;
    hasLoadedInitialMonitoring.current = true;
    void loadMonitoringData(defaultStartDate, defaultEndDate);
  }, [loadMonitoringData]);
  const detailPeriod = (
    range: typeof detailRange,
  ): FaqDetailResponse["usageTrend"]["period"] => {
    if (range === "6h") return "SIX_HOURS";
    if (range === "month") return "MONTH";
    if (range === "year") return "YEAR";
    return "DAY";
  };
  const fetchFaqDetail = async (
    faqIdText: string,
    range = detailRange,
    asOf = detailAsOf,
  ) => {
    const faqId = Number(faqIdText);
    if (!Number.isInteger(faqId) || faqId < 1) {
      setDetailError("올바른 FAQ ID를 입력해주세요.");
      return;
    }
    const requestId = ++detailRequestId.current;
    setDetailError("");
    setIsDetailLoading(true);
    setDetailFaqId(String(faqId));
    setFaqDetail(null);
    try {
      const detail = await faqMonitoringApi.getFaqDetail(
        faqId,
        detailPeriod(range),
        toAsOfDateTime(asOf),
      );
      if (requestId === detailRequestId.current) setFaqDetail(detail);
    } catch (error) {
      if (requestId === detailRequestId.current)
        setDetailError(
          error instanceof Error
            ? error.message
            : "FAQ 상세정보를 불러오지 못했습니다.",
        );
    } finally {
      if (requestId === detailRequestId.current) setIsDetailLoading(false);
    }
  };
  const selectFaqFromRanking = (faqId: number) => {
    const now = new Date();
    setDetailRange("month");
    setDetailAsOf(now);
    void fetchFaqDetail(String(faqId), "month", now);
  };
  const changeDetailRange = (range: typeof detailRange) => {
    setDetailRange(range);
    if (detailFaqId) void fetchFaqDetail(detailFaqId, range);
  };
  const changeDetailDate = (value: string) => {
    if (!value) return;
    const asOf = new Date(`${value}T00:00:00`);
    setDetailAsOf(asOf);
    if (detailFaqId) void fetchFaqDetail(detailFaqId, detailRange, asOf);
  };
  const moveDetailWindow = (direction: -1 | 1) => {
    const asOf = new Date(detailAsOf);
    if (detailRange === "6h") asOf.setHours(asOf.getHours() + direction * 6);
    else if (detailRange === "today") asOf.setDate(asOf.getDate() + direction);
    else if (detailRange === "month")
      asOf.setMonth(asOf.getMonth() + direction);
    else asOf.setFullYear(asOf.getFullYear() + direction);
    setDetailAsOf(asOf);
    if (detailFaqId) void fetchFaqDetail(detailFaqId, detailRange, asOf);
  };
  const canMoveToNextDetailWindow = () => {
    const next = new Date(detailAsOf);
    if (detailRange === "6h") next.setHours(next.getHours() + 6);
    else if (detailRange === "today") next.setDate(next.getDate() + 1);
    else if (detailRange === "month") next.setMonth(next.getMonth() + 1);
    else next.setFullYear(next.getFullYear() + 1);
    return next <= new Date();
  };
  const loadImprovements = useCallback((
    page: number,
    types: FaqImprovementType[],
  ) => {
    const requestId = ++improvementRequestId.current;
    void faqMonitoringApi
      .getFaqImprovements(page, improvementPageSize, types)
      .then((response) => {
        if (requestId === improvementRequestId.current)
          setImprovementResponse(response);
      })
      .catch((error) => {
        console.error("개선 대상 FAQ를 불러오지 못했습니다.", error);
        if (requestId === improvementRequestId.current)
          setImprovementError(
            error instanceof ApiRequestError
              ? `${error.message} (HTTP ${error.status})`
              : error instanceof Error
                ? error.message
                : "네트워크 오류",
          );
      })
      .finally(() => {
        if (requestId === improvementRequestId.current)
          setIsImprovementLoading(false);
      });
  }, []);
  useEffect(() => {
    loadImprovements(improvementPage, selectedImprovementTypes);
  }, [loadImprovements, improvementPage, selectedImprovementTypes]);
  const improvementItems = improvementResponse?.items ?? [];
  const toggleImprovementType = (type: FaqImprovementType) => {
    setImprovementResponse(null);
    setImprovementError(null);
    setIsImprovementLoading(true);
    setSelectedImprovementTypes((current) =>
      current.includes(type)
        ? current.filter((selected) => selected !== type)
        : [...current, type],
    );
    setImprovementPage(0);
    setSelectedImprovementFaqId(null);
  };
  const refreshImprovements = () => {
    setIsImprovementLoading(true);
    setImprovementError(null);
    loadImprovements(improvementPage, selectedImprovementTypes);
  };
  const usageRankingItems =
    monitoringData?.faqUsageRanking[usageIntent][usageType] ?? [];
  const similarityRankingItems =
    monitoringData?.faqSimilarityRanking[similarityIntent][similarityType] ??
    [];
  const selectedImprovementItem =
    improvementItems.find((item) => item.faqId === selectedImprovementFaqId) ??
    null;
  const selectedDuplicateFaqId =
    selectedImprovementItem?.improvementTypes.includes("DUPLICATE_SUSPECTED")
      ? selectedImprovementItem.faqId
      : null;
  const duplicateRequestKey =
    selectedDuplicateFaqId === null
      ? null
      : `${selectedDuplicateFaqId}:${improvementResponse?.evaluatedAt ?? ""}`;
  const selectedDuplicateCandidates =
    duplicateCandidates?.key === duplicateRequestKey
      ? duplicateCandidates.items
      : null;
  const duplicateError =
    duplicateRequestError?.key === duplicateRequestKey
      ? duplicateRequestError.message
      : null;
  const isDuplicateLoading =
    duplicateRequestKey !== null &&
    selectedDuplicateCandidates === null &&
    duplicateError === null;
  useEffect(() => {
    const requestId = ++duplicateRequestId.current;
    if (selectedDuplicateFaqId === null || duplicateRequestKey === null) return;
    void faqMonitoringApi
      .getDuplicateCandidates(selectedDuplicateFaqId)
      .then((items) => {
        if (requestId === duplicateRequestId.current)
          setDuplicateCandidates({ key: duplicateRequestKey, items });
      })
      .catch((error) => {
        console.error("중복 의심 FAQ를 불러오지 못했습니다.", error);
        if (requestId === duplicateRequestId.current)
          setDuplicateRequestError({
            key: duplicateRequestKey,
            message: error instanceof ApiRequestError
              ? `${error.message} (HTTP ${error.status})`
              : error instanceof Error
                ? error.message
                : "네트워크 오류",
          });
      });
  }, [selectedDuplicateFaqId, duplicateRequestKey]);
  const stopDuplicateDrag = () => {
    duplicateDragRef.current = null;
    setIsDuplicateDragging(false);
  };
  return (
    <section className="faq-dashboard">
      <header className="faq-dashboard-heading">
        <div>
          <p className="faq-dashboard-heading__eyebrow">FAQ MONITORING</p>
          <h1>FAQ 관리 대시보드</h1>
          <p>
            사용자 질문과 FAQ 검색 데이터를 기반으로 FAQ의 사용성과 검색 품질을
            모니터링합니다.
          </p>
        </div>
        <div className="faq-dashboard-controls">
          <div className="faq-dashboard-segments">
            <button
              className={periodMode === "7d" ? "is-active" : ""}
              onClick={() => setRecentPeriod(7)}
              type="button"
            >
              최근 7일
            </button>
            <button
              className={periodMode === "30d" ? "is-active" : ""}
              onClick={() => setRecentPeriod(30)}
              type="button"
            >
              최근 30일
            </button>
            <button
              className={periodMode === "custom" ? "is-active" : ""}
              onClick={() => setPeriodMode("custom")}
              type="button"
            >
              직접 입력
            </button>
          </div>
          <div className="faq-dashboard-date-inputs">
            <input
              aria-label="시작 날짜"
              onChange={(event) => {
                setStartDate(event.target.value);
                setPeriodMode("custom");
              }}
              type="date"
              value={startDate}
            />
            <span>~</span>
            <input
              aria-label="종료 날짜"
              onChange={(event) => {
                setEndDate(event.target.value);
                setPeriodMode("custom");
              }}
              type="date"
              value={endDate}
            />
            <button
              disabled={isMonitoringLoading}
              onClick={() => void loadMonitoringData(startDate, endDate)}
              type="button"
            >
              {isMonitoringLoading ? "요청 중" : "적용"}
            </button>
          </div>
        </div>
      </header>

      <section className="faq-dashboard-section faq-dashboard-section--unanswered">
        <div className="faq-dashboard-section__title">
          <span className="faq-dashboard-section__number">01</span>
          <h2>미처리 질문 모니터링</h2>
        </div>
        <div className="faq-dashboard-unanswered">
          <article>
            <span>전체 질문 수</span>
            <strong>
              {monitoringData
                ? monitoringData.unansweredQuestionSummary.totalQuestionCount.toLocaleString(
                    "ko-KR",
                  )
                : "-"}
            </strong>
            <p>선택한 기간의 전체 질문</p>
          </article>
          <article>
            <span>미처리 질문 수</span>
            <strong>
              {monitoringData
                ? monitoringData.unansweredQuestionSummary.unansweredQuestionCount.toLocaleString(
                    "ko-KR",
                  )
                : "-"}
            </strong>
            <p>기간 내 답변되지 않은 질문</p>
          </article>
          <article>
            <span>미처리 비율</span>
            <strong>
              {monitoringData
                ? `${(monitoringData.unansweredQuestionSummary.unansweredRate * 100).toFixed(1)}%`
                : "-"}
            </strong>
            <p>전체 질문 대비 미처리 질문 비율</p>
          </article>
        </div>
      </section>

      <div className="faq-dashboard-monitoring-row">
        <section className="faq-dashboard-section faq-dashboard-section--usage">
          <div className="faq-dashboard-section__title">
            <span className="faq-dashboard-section__number">02</span>
            <h2>FAQ 사용량 TOP/LOW 20</h2>
          </div>
          <div className="faq-dashboard-tabs">
            <button
              className={usageType === "top" ? "is-active" : ""}
              onClick={() => setUsageType("top")}
              type="button"
            >
              TOP 20
            </button>
            <button
              className={usageType === "low" ? "is-active" : ""}
              onClick={() => setUsageType("low")}
              type="button"
            >
              LOW 20
            </button>
            <div className="faq-dashboard-intent-tabs">
              <button
                className={usageIntent === "all" ? "is-active" : ""}
                onClick={() => setUsageIntent("all")}
                type="button"
              >
                전체
              </button>
              <button
                className={usageIntent === "userData" ? "is-active" : ""}
                onClick={() => setUsageIntent("userData")}
                type="button"
              >
                사용자 데이터 필요
              </button>
              <button
                className={usageIntent === "storeData" ? "is-active" : ""}
                onClick={() => setUsageIntent("storeData")}
                type="button"
              >
                매장 데이터 필요
              </button>
            </div>
          </div>
          <div className="faq-dashboard-monitoring-content">
            <UsageChartFrame items={usageRankingItems} />
            <DraggableRankStrip
              items={usageRankingItems}
              metric="usage"
              onSelect={selectFaqFromRanking}
            />
          </div>
        </section>

        <section className="faq-dashboard-section faq-dashboard-section--similarity">
          <div className="faq-dashboard-section__title">
            <span className="faq-dashboard-section__number">03</span>
            <h2>FAQ 평균 Similarity TOP/LOW 20</h2>
            <div className="faq-dashboard-average">
              <span>전체 FAQ 평균 Similarity: </span>
              <strong>
                {monitoringData
                  ? monitoringData.faqSimilarityRanking.overallAverageSimilarity.toFixed(
                      3,
                    )
                  : "-"}
              </strong>
            </div>
          </div>
          <div className="faq-dashboard-tabs">
            <button
              className={similarityType === "top" ? "is-active" : ""}
              onClick={() => setSimilarityType("top")}
              type="button"
            >
              TOP 20
            </button>
            <button
              className={similarityType === "low" ? "is-active" : ""}
              onClick={() => setSimilarityType("low")}
              type="button"
            >
              LOW 20
            </button>
            <div className="faq-dashboard-intent-tabs">
              <button
                className={similarityIntent === "all" ? "is-active" : ""}
                onClick={() => setSimilarityIntent("all")}
                type="button"
              >
                전체
              </button>
              <button
                className={similarityIntent === "userData" ? "is-active" : ""}
                onClick={() => setSimilarityIntent("userData")}
                type="button"
              >
                사용자 데이터 필요
              </button>
              <button
                className={similarityIntent === "storeData" ? "is-active" : ""}
                onClick={() => setSimilarityIntent("storeData")}
                type="button"
              >
                매장 데이터 필요
              </button>
            </div>
          </div>
          <div className="faq-dashboard-monitoring-content">
            <SimilarityChartFrame items={similarityRankingItems} />
            <DraggableRankStrip
              items={similarityRankingItems}
              metric="similarity"
              onSelect={selectFaqFromRanking}
            />
          </div>
        </section>
      </div>

      <div className="faq-dashboard-pair faq-dashboard-pair--bottom">
        <section className="faq-dashboard-section faq-dashboard-section--detail">
          <div className="faq-dashboard-section__title">
            <span className="faq-dashboard-section__number">04</span>
            <h2>FAQ 상세정보</h2>
            {detailError && (
              <p className="faq-dashboard-detail-error">{detailError}</p>
            )}
          </div>
          <div className="faq-dashboard-detail">
            <div className="faq-dashboard-detail__basic">
              <span>FAQ ID</span>
              <div className="faq-dashboard-detail__search">
                <input
                  aria-label="FAQ ID"
                  onChange={(event) => setDetailFaqId(event.target.value)}
                  placeholder="FAQ ID 입력"
                  value={detailFaqId}
                />
                <button
                  disabled={isDetailLoading}
                  onClick={() => void fetchFaqDetail(detailFaqId)}
                  type="button"
                >
                  {isDetailLoading ? "조회 중" : "적용"}
                </button>
              </div>
              <span>질문</span>
              <b>{faqDetail?.basicInfo.question ?? ""}</b>
              <span>카테고리</span>
              <b>{faqDetail?.basicInfo.categoryName ?? ""}</b>
              <span>의도</span>
              <b>{faqDetail?.basicInfo.intent ?? ""}</b>
              <span>현재 버전</span>
              <b>{faqDetail ? `v${faqDetail.basicInfo.version}` : ""}</b>
              <span>최종 수정일</span>
              <b>
                {faqDetail?.basicInfo.updatedAt
                  .slice(0, 19)
                  .replace("T", " ") ?? ""}
              </b>
              <div className="faq-dashboard-detail__metrics">
                <div>
                  <span>평균 Similarity</span>
                  <strong>
                    {faqDetail
                      ? faqDetail.similarity.averageSimilarity.toFixed(3)
                      : ""}
                  </strong>
                </div>
                <div>
                  <span>평균 Gap</span>
                  <strong>
                    {faqDetail ? faqDetail.topGap.averageGap.toFixed(3) : ""}
                  </strong>
                </div>
              </div>
            </div>
            <div className="faq-dashboard-detail__trend">
              <div className="faq-dashboard-detail__trend-heading">
                <h3>사용량 추이</h3>
                <div className="faq-dashboard-detail__trend-controls">
                  <input
                    aria-label="사용량 추이 기준 날짜"
                    className="faq-dashboard-detail__date"
                    max={toInputDate(new Date())}
                    onChange={(event) => changeDetailDate(event.target.value)}
                    type="date"
                    value={toInputDate(detailAsOf)}
                  />
                  <div className="faq-dashboard-detail__range">
                  {(
                    [
                      { key: "6h", label: "6시간" },
                      { key: "today", label: "하루" },
                      { key: "month", label: "월" },
                      { key: "year", label: "년" },
                    ] as const
                  ).map((item) => (
                    <button
                      className={detailRange === item.key ? "is-active" : ""}
                      key={item.key}
                      onClick={() => changeDetailRange(item.key)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                  </div>
                </div>
              </div>
              <div className="faq-dashboard-detail__trend-navigator">
                <button aria-label="이전 집계 단위" className="faq-dashboard-detail__arrow" disabled={isDetailLoading} onClick={() => moveDetailWindow(-1)} type="button">‹</button>
                <DetailUsageChart detail={faqDetail} />
                <button aria-label="다음 집계 단위" className="faq-dashboard-detail__arrow" disabled={isDetailLoading || !canMoveToNextDetailWindow()} onClick={() => moveDetailWindow(1)} type="button">›</button>
              </div>
            </div>
            <div className="faq-dashboard-cooccurring">
              <h3>함께 등장한 FAQ Top 5</h3>
              <table className="faq-dashboard-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>FAQ ID</th>
                    <th>FAQ 질문</th>
                    <th>의도</th>
                    <th>동시 등장 횟수</th>
                    <th>동시 등장 비율</th>
                  </tr>
                </thead>
                <tbody>
                  {faqDetail
                    ? faqDetail.cooccurringFaqs
                        .slice(0, 5)
                        .map((item, index) => (
                          <tr key={item.faqId}>
                            <td>{index + 1}</td>
                            <td>{item.faqId}</td>
                            <td>{item.question}</td>
                            <td>{item.intent}</td>
                            <td>
                              {item.coOccurrenceCount.toLocaleString("ko-KR")}
                            </td>
                            <td>{(item.coOccurrenceRate * 100).toFixed(1)}%</td>
                          </tr>
                        ))
                    : Array.from({ length: 5 }, (_, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td />
                          <td />
                          <td />
                          <td />
                          <td />
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section className="faq-dashboard-section faq-dashboard-section--improvement">
          <div className="faq-dashboard-section__title">
            <span className="faq-dashboard-section__number">05</span>
            <h2>개선이 필요한 FAQ</h2>
            <button
              aria-label="개선이 필요한 FAQ 새로고침"
              className="faq-dashboard-improvement-refresh"
              disabled={isImprovementLoading}
              onClick={refreshImprovements}
              type="button"
            >
              ↻
            </button>
          </div>
          <p className="faq-dashboard-improvement-hint">
            FAQ 행을 클릭하면 하단에서 질문과 추가 지표를 확인할 수 있습니다.
          </p>
          <p className="faq-dashboard-improvement-filter-hint">
            여러 유형을 선택하면 모두 해당하는 FAQ를 보여줍니다.
          </p>
          {improvementError && (
            <p className="faq-dashboard-improvement-error" role="alert">
              개선 대상 FAQ를 불러오지 못했습니다. {improvementError}
            </p>
          )}
          <div
            aria-label="개선 유형 필터"
            className="faq-dashboard-improvement-filters"
            role="group"
          >
            <span>개선 유형</span>
            <button
              aria-pressed={selectedImprovementTypes.length === 0}
              className={selectedImprovementTypes.length === 0 ? "is-active" : ""}
              onClick={() => {
                if (selectedImprovementTypes.length === 0) return;
                setImprovementResponse(null);
                setImprovementError(null);
                setIsImprovementLoading(true);
                setSelectedImprovementTypes([]);
                setImprovementPage(0);
                setSelectedImprovementFaqId(null);
              }}
              type="button"
            >
              전체
            </button>
            {improvementTypes.map((type) => (
              <button
                aria-pressed={selectedImprovementTypes.includes(type)}
                className={selectedImprovementTypes.includes(type) ? "is-active" : ""}
                data-type={type}
                key={type}
                onClick={() => toggleImprovementType(type)}
                type="button"
              >
                {improvementTypeLabel[type]}
                {type !== "DUPLICATE_SUSPECTED" && (
                  <b className="faq-dashboard-improvement-type-arrow">⬇</b>
                )}
              </button>
            ))}
          </div>
          <div className="faq-dashboard-table-wrap faq-dashboard-improvement-table-wrap">
            <table className="faq-dashboard-table faq-dashboard-improvement-table">
              <thead>
                <tr>
                  <th>FAQ ID</th>
                  <th>FAQ 질문</th>
                  <th>의도</th>
                  <th>FAQ 버전</th>
                  <th>버전 시작일</th>
                  <th>개선 유형</th>
                </tr>
              </thead>
              <tbody>
                {improvementItems.map((item) => (
                  <tr
                    className={
                      selectedImprovementFaqId === item.faqId
                        ? "is-selected"
                        : ""
                    }
                    key={item.faqId}
                    onClick={() => {
                      setDuplicateCandidates(null);
                      setDuplicateRequestError(null);
                      setSelectedImprovementFaqId((current) =>
                        current === item.faqId ? null : item.faqId,
                      );
                    }}
                  >
                    <td>{item.faqId}</td>
                    <td>
                      <span
                        className="faq-dashboard-improvement-question"
                        title={item.question}
                      >
                        {item.question}
                      </span>
                    </td>
                    <td>{item.intent}</td>
                    <td>v{item.faqVersion}</td>
                    <td>
                      {item.versionStartedAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td>
                      <div className="faq-dashboard-improvement-types">
                        {item.improvementTypes.map((type) => (
                          <span data-type={type} key={type}>
                            {improvementTypeLabel[type]}
                            {type !== "DUPLICATE_SUSPECTED" && (
                              <b className="faq-dashboard-improvement-type-arrow">⬇</b>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {improvementItems.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      {improvementResponse === null
                        ? improvementError
                          ? `개선 대상 FAQ를 불러오지 못했습니다. ${improvementError}`
                          : "개선 대상 FAQ를 불러오는 중입니다."
                        : selectedImprovementTypes.length === 0
                          ? "개선이 필요한 FAQ가 없습니다."
                          : "선택한 개선 유형에 해당하는 FAQ가 없습니다."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {improvementResponse && improvementResponse.totalPages > 1 && (
            <div className="faq-dashboard-improvement-pagination">
              <Pagination
                onChange={(page) => {
                  if (page === improvementPage) return;
                  setImprovementResponse(null);
                  setImprovementError(null);
                  setIsImprovementLoading(true);
                  setSelectedImprovementFaqId(null);
                  setImprovementPage(page);
                }}
                page={improvementResponse.page}
                showEdgeButtons
                totalPages={improvementResponse.totalPages}
              />
            </div>
          )}
          {selectedImprovementItem && (
            <div className="faq-dashboard-improvement-extra">
              <div className="faq-dashboard-improvement-extra__title">
                <b>추가 정보</b>
                <span>선택한 FAQ의 질문과 검색·사용 지표</span>
              </div>
              <div
                className={`faq-dashboard-improvement-extra__content${selectedDuplicateFaqId !== null ? " has-duplicates" : ""}`}
              >
                <div className="faq-dashboard-improvement-extra__left">
                  <div className="faq-dashboard-improvement-extra__question">
                    <span>FAQ 질문</span>
                    <p>{selectedImprovementItem.question}</p>
                  </div>
                  <div className="faq-dashboard-improvement-metrics">
                    <div>
                      <span>Top-K 포함 횟수</span>
                      <strong>
                        {selectedImprovementItem.topKCount.toLocaleString("ko-KR")}
                      </strong>
                    </div>
                    <div>
                      <span>평균 Similarity</span>
                      <strong>
                        {selectedImprovementItem.averageSimilarity.toFixed(3)}
                      </strong>
                    </div>
                    <div>
                      <span>Top-1 표본 수</span>
                      <strong>
                        {selectedImprovementItem.top1SampleCount.toLocaleString(
                          "ko-KR",
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>최근 사용량</span>
                      <strong>
                        {selectedImprovementItem.recentUsageCount.toLocaleString(
                          "ko-KR",
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>평균 Gap</span>
                      <strong>
                        {selectedImprovementItem.averageTopGap.toFixed(3)}
                      </strong>
                    </div>
                    <div>
                      <span>Low Gap 비율</span>
                      <strong>
                        {(selectedImprovementItem.lowGapRate * 100).toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
                {selectedDuplicateFaqId !== null && (
                  <div className="faq-dashboard-improvement-duplicates">
                    <h3>중복 의심 FAQ 목록</h3>
                    <p>
                      중복 비율 = 중복 횟수 ÷ 선택 FAQ의 Top-1 표본 수
                    </p>
                    <div
                      aria-label="중복 의심 FAQ 목록"
                      className={`faq-dashboard-improvement-duplicates__table-wrap${isDuplicateDragging ? " is-dragging" : ""}`}
                      onClickCapture={(event) => {
                        if (!suppressDuplicateClickRef.current) return;
                        event.preventDefault();
                        event.stopPropagation();
                        suppressDuplicateClickRef.current = false;
                      }}
                      onPointerDown={(event) => {
                        if (event.pointerType === "mouse" && event.button !== 0)
                          return;
                        const container = duplicateScrollRef.current;
                        if (!container) return;
                        suppressDuplicateClickRef.current = false;
                        duplicateDragRef.current = {
                          pointerId: event.pointerId,
                          clientX: event.clientX,
                          clientY: event.clientY,
                          scrollLeft: container.scrollLeft,
                          scrollTop: container.scrollTop,
                          dragging: false,
                        };
                      }}
                      onPointerMove={(event) => {
                        const drag = duplicateDragRef.current;
                        const container = duplicateScrollRef.current;
                        if (!drag || !container || drag.pointerId !== event.pointerId)
                          return;
                        if (!drag.dragging) {
                          if (
                            Math.abs(event.clientX - drag.clientX) < 5 &&
                            Math.abs(event.clientY - drag.clientY) < 5
                          )
                            return;
                          drag.dragging = true;
                          suppressDuplicateClickRef.current = true;
                          container.setPointerCapture(event.pointerId);
                          setIsDuplicateDragging(true);
                        }
                        container.scrollLeft = drag.scrollLeft - (event.clientX - drag.clientX);
                        container.scrollTop = drag.scrollTop - (event.clientY - drag.clientY);
                      }}
                      onPointerUp={(event) => {
                        const container = duplicateScrollRef.current;
                        if (container?.hasPointerCapture(event.pointerId))
                          container.releasePointerCapture(event.pointerId);
                        stopDuplicateDrag();
                      }}
                      onPointerCancel={stopDuplicateDrag}
                      onPointerLeave={() => {
                        if (!duplicateDragRef.current?.dragging) stopDuplicateDrag();
                      }}
                      onLostPointerCapture={stopDuplicateDrag}
                      ref={duplicateScrollRef}
                      role="region"
                      tabIndex={0}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>FAQ ID</th>
                            <th>질문</th>
                            <th>중복 횟수</th>
                            <th>중복 비율</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDuplicateCandidates?.map((candidate) => (
                            <tr
                              aria-label={`FAQ ${candidate.faqId} 상세정보 조회`}
                              className={`faq-dashboard-improvement-duplicates__row${detailFaqId === String(candidate.faqId) ? " is-selected" : ""}`}
                              key={candidate.faqId}
                              onClick={() => selectFaqFromRanking(candidate.faqId)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ")
                                  return;
                                event.preventDefault();
                                selectFaqFromRanking(candidate.faqId);
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <td>{candidate.faqId}</td>
                              <td title={candidate.question}>
                                <span>{candidate.question}</span>
                              </td>
                              <td>{candidate.pairCount.toLocaleString("ko-KR")}</td>
                              <td>
                                {selectedImprovementItem.top1SampleCount > 0
                                  ? `${((candidate.pairCount / selectedImprovementItem.top1SampleCount) * 100).toFixed(1)}%`
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                          {(!selectedDuplicateCandidates ||
                            selectedDuplicateCandidates.length === 0) && (
                            <tr>
                              <td colSpan={4}>
                                {duplicateError
                                  ? `중복 의심 FAQ를 불러오지 못했습니다. ${duplicateError}`
                                  : isDuplicateLoading ||
                                      selectedDuplicateCandidates === null
                                    ? "중복 의심 FAQ를 불러오는 중입니다."
                                    : "중복 의심 FAQ가 없습니다."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
