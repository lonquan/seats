/**
 * 获取节点竖轴 key
 * @param key
 * @returns {string}
 */
const getRowKey = (key) => {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  let result = ''

  while (key >= 0) {
    result = base[key % 26] + result
    key = Math.floor(key / 26) - 1
  }

  return result
}

/**
 * 节点状态
 * @type {{blocked: string, available: string, not_show: string}}
 */
const status = {
  normal: '正常', blocked: '不可用', not_show: '不显示',
}

/**
 * 节点类型
 * @type {{seat: string, passage: string, table: string}}
 const types = {
 seat: '座位', passage: '通道',
 square_table: '正方桌', circle_table: '圆形桌',
 rectangle_table: '长方桌', hexagon_table: '六边桌',
 octagon_table: '八边桌', background: '背景'
 }
 */

/**
 * 节点默认数据
 * @type {{id: null, state: string, type: string, tags: number[]}}
 */
const nodeItem = (type = 'seat', title = null) => ({
  id: null, state: 'normal', type: type, tags: [], graph: {}, title: title,
})

/**
 * 可拖动的节点配置
 const dndNodes = [
 {
 type: 'seat', label: '座位', data: {shape: 'rect', width: 50, height: 50},
 },
 {
 type: 'square_table', label: '正方桌', data: {shape: 'rect', width: 50, height: 50},
 },
 {
 type: 'circle_table', label: '圆形桌', data: {shape: 'circle', width: 50, height: 50},
 },
 {
 type: 'rectangle_table', label: '长方桌', data: {shape: 'rect', width: 100, height: 50},
 },
 {
 type: 'hexagon_table', label: '六边桌', data: {
 shape: 'polygon', width: 50, height: 50,
 points: '25,0 50,12.5 50,37.5 25,50 0,37.5 0,12.5',
 },
 },
 {
 type: 'octagon_table', label: '八边桌', data: {
 shape: 'polygon', width: 50, height: 50,
 points: '14.64,0 35.36,0 50,14.64 50,35.36 35.36,50 14.64,50 0,35.36 0,14.64',
 },
 },
 ]
 */

const strokeStyle = {
  normal: (size) => ({
    body: {
      strokeWidth: '1px', rx: '8px', ry: '8px', stroke: '#676767', fill: '#ffffff', strokeDasharray: null,
      width: size.width, height: size.height,
    },
    label: {
      fontSize: 14, fill: '#000000', refX: 0.5, refY: 0.5, textAnchor: 'middle', textVerticalAnchor: 'middle',
    },
  }),
  dotted: (size) => ({
    body: {
      stroke: '#676767', strokeWidth: '1px', rx: '8px', ry: '8px', fill: 'transparent', strokeDasharray: '5.5',
      width: size.width, height: size.height,
    },
    label: {
      fontSize: 14, fill: '#000000', refX: 0.5, refY: 0.5, textAnchor: 'middle', textVerticalAnchor: 'middle',
    },
  })
}

const defaultSize = {width: 50, height: 50}

const getGradientItems = (ids, tags) => {
  const _tags = []
  const items = []

  ids.forEach(id => {
    const tag = tags.find(t => t.id === id)
    tag && _tags.push(tag)
  })

  // {tagName: 'stop', attrs: {offset: '0%', style: 'stop-color:red;stop-opacity:1'}},
  let step = 100 / _tags.length

  let prev = 0
  for (let i = 1; i <= _tags.length; i++) {
    const currentStep = step * i
    const tag = _tags[i - 1]
    items.push(
        {tagName: 'stop', attrs: {offset: `${ prev }%`, style: `stop-color:${ tag.color };stop-opacity:1`}},
        {tagName: 'stop', attrs: {offset: `${ currentStep }%`, style: `stop-color:${ tag.color };stop-opacity:1`}},
    )
    prev = currentStep
  }
  return items
}

const bookingStatus = [
  {title: '可预约', desc: null, color: null, id: 'bookable'},
  {title: '已预约', desc: '(周期性)', color: 'rgba(245,177,80,0.4)', id: 'booked_period'},
  {title: '已预约', desc: '(一次性)', color: 'rgba(54,187,95,0.3)', id: 'booked'},
  {title: '周期性预约', desc: '(审批中)', color: 'rgba(48,102,225,0.3)', id: 'pending'},
]

const tags = [
  {id: 1, title: '安静', color: '#37A0FB', icon: 'quiet'},
  {id: 2, title: '阳光', color: '#F6B25F', icon: 'sun'},
  {id: 3, title: '舒适', color: '#43BC69', icon: 'comfort'},
]

export {
  defaultSize,
  strokeStyle,
  status,
  bookingStatus,
  tags,
  nodeItem,
  getRowKey,
  getGradientItems,
}
