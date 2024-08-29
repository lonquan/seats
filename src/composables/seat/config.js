export const status = {
  available: '可选', reserved: '已预订', blocked: '不可用', not_show: '不显示',
}

export const createStatus = {
  available: '正常', blocked: '不可用', not_show: '不显示',
}

export const tags = [
  {id: 1, title: '安静', color: '#37A0FB'},
  {id: 2, title: '阳光', color: '#F6B25F'},
  {id: 3, title: '舒适', color: '#43BC69'},
]

export const types = {
  seat: '座位', passage: '通道'
}

export const item = {
  id: null, row: null, column: null, state: 'available', type: 'seat', tags: [],
}

export const layout = {type: 'normal', items: [], rows: 0, cols: 0}
