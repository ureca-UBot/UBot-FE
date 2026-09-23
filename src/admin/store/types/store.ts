export interface StoreService { code: string; name: string }

export interface StoreListItem {
  storeId: number; storeName: string; sido: string | null; sigungu: string | null; address: string
  latitude: number; longitude: number; phoneNumber: string | null; businessHours: string | null
}

export interface StoreDetail extends StoreListItem { services: StoreService[] }

export interface AdminStore extends StoreDetail { active: boolean; createdAt: string; updatedAt: string }

export interface StoreFormValues {
  storeName: string; sido: string; sigungu: string; address: string; latitude: number; longitude: number
  phoneNumber: string; businessHours: string; serviceCodes: string[]
}

export interface StoreListParams { sido?: string; sigungu?: string; serviceCodes?: string[]; page?: number; size?: number }
