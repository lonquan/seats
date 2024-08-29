<template>
  <div class="x-container">
    <div class="x-container">
      <div class="x-canvas" ref="graph"></div>
    </div>

    <div class="x-menu" v-if="contextMenu.show">
      <div class="x-menu-maks" @click="contextMenu.show = false"></div>
      <div class="x-menu-list" :style="{top: `${contextMenu.y}px`, left: `${contextMenu.x}px`}">
        <el-cascader-panel
            :props="{expandTrigger: 'hover', multiple: false}"
            :options="contextMenuConfig"
            @change="handleChooseMenu"
        />
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import {Graph} from '@antv/x6'
import {Selection} from '@antv/x6-plugin-selection'
import {getColKey} from '@/helpers'
import {createStatus, tags, types} from '@/composables/seat/config'

export default {
  name: 'X6Graph',
  props: {
    type: {required: true, validator: value => ['normal', 'shape'].includes(value)},
    rows: {required: true, type: Number, default: 0},
    cols: {required: true, type: Number, default: 0},
    items: {required: true, type: Array},
    config: {type: Object, default: () => ({})},
    tags: {type: Array},
  },

  data() {
    return {
      graph: null,
      empty: [],
      contextMenu: {
        x: 0,
        y: 0,
        show: false,
        cell: null,
      },
    }
  },

  computed: {
    contextMenuConfig() {
      return [
        {value: 'type', label: '类型', children: Object.entries(types).map(item => ({label: item[1], value: item[0]}))},
        {
          value: 'state',
          label: '状态',
          children: Object.entries(createStatus).map(item => ({label: item[1], value: item[0]})),
        },
        {
          value: 'tags', label: '标签', children: [
            {label: '添加', value: 'add', children: tags.map(item => ({label: item.title, value: item.id}))},
            {label: '清空', value: 'clean'},
          ],
        },
      ]
    },

    passageNodeAttr() {
      return {
        rect: {
          stroke: '#676767',
          strokeWidth: '1px',
          rx: '6px',
          ry: '6px',
          fill: 'transparent',
          strokeDasharray: '5.5',
        },
        label: '通道',
      }
    },

    seatNodeBlockedAttr() {
      return {
        rect: {stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', strokeDasharray: '5.5'},
        label: '不可用',
      }
    },
    seatNodeNotShowAttr() {
      return {
        rect: {stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', strokeDasharray: '5.5'},
        label: '不显示',
      }
    },
  },

  mounted() {
    this.makeGraphInstance()
    this.items.length && this.draw()
    this.listenEvent()
    this.resetZoom()
  },

  methods: {
    getGradientItems(ids) {
      const tags = []
      const items = []
      ids.forEach(id => {
        const tag = this.tags.find(t => t.id === id)
        if (tag) {
          tags.push(tag)
        }
      })

      // {tagName: 'stop', attrs: {offset: '0%', style: 'stop-color:red;stop-opacity:1'}},
      let step = 100 / tags.length

      let prev = 0
      for (let i = 1; i <= tags.length; i++) {
        const currentStep = step * i
        const tag = tags[i - 1]
        items.push(
            {tagName: 'stop', attrs: {offset: `${ prev }%`, style: `stop-color:${ tag.color };stop-opacity:1`}},
            {tagName: 'stop', attrs: {offset: `${ currentStep }%`, style: `stop-color:${ tag.color };stop-opacity:1`}},
        )
        prev = currentStep
      }
      return items
    },

    handleChooseMenu(val) {
      const cells = this.graph.getSelectedCells()

      this.$emit('command', {
        cells: cells.length ? cells.map(c => c.getData()) : [this.contextMenu.cell],
        action: [...val],
      })

      this.graph.resetSelection()
      this.contextMenu.show = false
      this.contextMenu.cell = null
    },

    draw() {
      // 清空画布
      this.graph.clearCells()
      // 距离最外面的边距
      const padding = 150
      // 每个座位之间的距离
      const gap = 25
      // 每个座位的大小
      const size = 50

      let currentRow = 0
      this.items.forEach(rows => {
        let currentCol = 0

        // 插入横排标题
        this.graph.addNode({
          shape: 'rect',
          x: 75,
          y: 150 + currentRow * size + currentRow * gap,
          width: size,
          height: size,
          label: getColKey(currentRow),
          attrs: {
            rect: {fill: 'transparent', stroke: null},
            text: {fontSize: '30px', fill: '#676767'},
          },
        })

        rows.forEach(cell => {
          // 插入竖排标题
          if (currentRow === 0) {
            this.graph.addNode({
              shape: 'rect',
              x: 150 + currentCol * size + currentCol * gap,
              y: 75,
              width: size,
              height: size,
              label: `${ currentCol + 1 }`,
              attrs: {
                rect: {fill: 'transparent', stroke: null},
                text: {fontSize: '30px', fill: '#676767'},
              },
            })
          }

          let rectAttr = {
            label: null,
            rect: {strokeWidth: '1px', rx: '6px', ry: '6px', stroke: '#676767'},
          }

          // 过道样式
          if (cell.type === 'passage') {
            rectAttr = this.passageNodeAttr
          }

          // 座位, 不可用
          if (cell.type === 'seat' && cell.state === 'blocked') {
            rectAttr = this.seatNodeBlockedAttr
          }

          // 座位, 不显示
          if (cell.type === 'seat' && cell.state === 'not_show') {
            rectAttr = this.seatNodeNotShowAttr
          }

          const node = {
            shape: 'rect',
            x: padding + currentCol * size + currentCol * gap,
            y: padding + currentRow * size + currentRow * gap,
            width: size,
            height: size,
            data: cell,
            label: rectAttr.label,
            markup: [
              {tagName: 'rect', selector: 'body'},
              {tagName: 'text', selector: 'label'},
            ],
            attrs: {
              body: rectAttr.rect,
              label: {fontSize: '12px'},
            },
          }

          /*
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:rgb(255,255,0);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="80" height="80" rx="10" ry="10" fill="url(#gradient)" />
          */

          // 标签
          if (cell.type === 'seat' && cell.tags.length) {
            const gradientItems = this.getGradientItems(cell.tags)
            const gradientId = `gradient-r${ cell.row }-c${ cell.column }`
            const markup = [
              {
                tagName: 'defs', children: [
                  {
                    tagName: 'linearGradient', attrs: {id: gradientId, x1: '0%', y1: '0%', x2: '0%', y2: '100%'},
                    children: gradientItems,
                  },
                ],
              },
              {tagName: 'rect', selector: 'tags'},
              {tagName: 'text', selector: 'label'},
            ]
            node.markup = markup
            node.attrs.tags = {
              stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', width: size, height: size,
              fill: `url(#${ gradientId })`,
            }
          }

          this.graph.addNode(node)
          currentCol++
        })
        currentRow++
      })
    },

    listenEvent() {
      // 右击元素
      this.graph.on('node:contextmenu', ({e, x, y, node, view}) => {
        this.contextMenu.x = e.clientX
        this.contextMenu.y = e.clientY
        this.contextMenu.show = true
        this.contextMenu.cell = node.getData()
      })
    },

    resetZoom() {
      this.graph.zoomToFit({maxScale: 0.8})
    },

    getGraphConfig() {
      return Object.assign({
        background: {color: '#F2F7FA'},
        autoResize: true,
        width: 800,
        height: 800,
        grid: {
          visible: true,
          type: 'doubleMesh',
          args: [
            {color: '#eee', thickness: 1},
            {color: '#ddd', thickness: 1, factor: 4},
          ],
        },
        panning: { // 拖动
          enabled: true,
          modifiers: ['space'],
        },
        mousewheel: { // 缩放
          enabled: true,
          modifiers: ['alt'],
        },
        interacting: {
          nodeMovable: false,
        },
        translating: {
          restrict: true,
        },
      }, this.config)
    },

    makeGraphInstance() {
      this.graph = new Graph({
        container: this.$refs.graph,
        ...this.getGraphConfig(),
      })

      this.graph.use(new Selection({
        enabled: true,
        multiple: false,
        rubberband: true,
        movable: false,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
        strict: false,
        className: 'x-selector',
        modifiers: ['shift'],
        filter: (cell) => cell.getData()?.id !== undefined,
      }))
    },
  },
}
</script>

<style scoped lang="scss">
.x-container {
  width: 100%;
  height: 100%;
}

.x-menu {
  .x-menu-maks {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 99998;
  }

  .x-menu-list {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 99999;
    background: #fff;

    .item {
      padding: 10px;
      cursor: pointer;
    }

    .divider {
      margin: 0;
    }
  }
}
</style>
