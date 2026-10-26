const assert = require('node:assert/strict')

async function assertCounselLayout(page, { overflowing = false } = {}) {
  await page.locator('.counsel-message.mine').first().waitFor()
  assert.equal(
    await page.locator('.page-hero-copy p').evaluate((heading) => getComputedStyle(heading).color),
    'rgb(104, 107, 114)',
    'counselor heading must retain its color regardless of lazy CSS loading order',
  )
  const layout = await page.locator('.counsel-conversation').evaluate((conversation) => {
    const list = conversation.querySelector('.counsel-messages')
    const compose = conversation.querySelector('.counsel-compose')
    const input = compose.querySelector('.counsel-input')
    const textarea = input.querySelector('textarea')
    const send = input.querySelector('.send-ai')
    const avatar = list.querySelector('.msg-avatar')
    const mine = list.querySelector('.counsel-message.mine')
    const bubble = mine.querySelector('.msg-body')
    const rect = (element) => element.getBoundingClientRect().toJSON()
    return {
      listDisplay: getComputedStyle(list).display,
      listOverflow: getComputedStyle(list).overflowY,
      listHeight: list.clientHeight,
      contentHeight: list.scrollHeight,
      avatar: rect(avatar),
      inputDisplay: getComputedStyle(input).display,
      input: rect(input),
      textarea: rect(textarea),
      send: rect(send),
      list: rect(list),
      compose: rect(compose),
      mineAlignment: getComputedStyle(mine).justifyContent,
      bubbleColor: getComputedStyle(bubble).color,
      bubbleBackground: getComputedStyle(bubble).backgroundColor,
      sendBackground: getComputedStyle(send).backgroundColor,
      sendDisabled: send.disabled,
      horizontalOverflow: list.scrollWidth > list.clientWidth + 1,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
    }
  })
  assert.equal(layout.listDisplay, 'flex', 'message layout must load on direct counselor entry')
  assert.equal(layout.listOverflow, 'auto', 'history must scroll inside the message panel')
  if (overflowing) assert.ok(layout.contentHeight > layout.listHeight, 'long history must scroll')
  assert.equal(layout.avatar.width, 32, 'shared chat avatar must retain its size')
  assert.equal(layout.avatar.height, 32)
  assert.equal(layout.inputDisplay, 'grid', 'composer must load shared input styles')
  assert.ok(layout.compose.top >= layout.list.bottom - 1, 'composer must not overlap history')
  assert.ok(layout.textarea.right <= layout.send.left, 'send button must not overlap input')
  assert.ok(layout.send.right <= layout.input.right, 'send button must stay inside composer')
  assert.equal(layout.send.width, 44)
  assert.equal(layout.send.height, 44)
  assert.equal(
    layout.sendBackground,
    layout.sendDisabled ? 'rgb(255, 240, 247)' : 'rgb(247, 37, 133)',
  )
  assert.equal(layout.mineAlignment, 'flex-end')
  assert.equal(layout.bubbleColor, 'rgb(23, 23, 26)')
  assert.equal(layout.bubbleBackground, 'rgb(255, 240, 247)')
  assert.equal(layout.horizontalOverflow, false, 'long messages must wrap inside the panel')
  assert.equal(layout.pageOverflow, false, 'page must fit the viewport')
  return layout
}

module.exports = { assertCounselLayout }
