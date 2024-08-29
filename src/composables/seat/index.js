/* eslint-disable */
import {cloneDeep} from 'lodash'
import {item, layout} from '@/composables/seat/config'

const makeItem = () => cloneDeep(item)

export default {
  calcItems(layout) {
    const rowCount = layout.rows
    const colCount = layout.cols
    const items = Array.from(layout.items)
    // 修剪到指定长度
    items.splice(rowCount)

    // 行
    for (let r = 0; r < rowCount; r++) {
      if (items[r] === undefined) {
        items[r] = []
      }

      // 列
      for (let c = 0; c < colCount; c++) {
        items[r].splice(colCount)
        const item = items[r][c] === undefined ? makeItem() : items[r][c]
        item.row = r
        item.column = c
        items[r][c] = item
      }
    }

    return items
  },

  makeLayout() {
    return cloneDeep(layout)
  },

  getAlphaKey(key) {
    const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    let result = ''

    while (key >= 0) {
      result = base[key % 26] + result
      key = Math.floor(key / 26) - 1
    }

    return result
  },
}
