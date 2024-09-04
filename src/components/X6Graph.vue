<template>
  <div class="x-container">
    <div class="x-dnd-wrap" ref="dndContainer" v-show="type === 'custom'">
      <div class="dnd-item" @mousedown="evt => handleStartDragItem(evt)"></div>

    </div>

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
import {Transform} from '@antv/x6-plugin-transform'
import {Snapline} from '@antv/x6-plugin-snapline'
import {Dnd} from '@antv/x6-plugin-dnd'
import {History} from '@antv/x6-plugin-history'
import {merge} from 'lodash'

/**
 * 获取节点竖轴 key
 * @param key
 * @returns {string}
 */
const getColKey = (key) => {
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
 octagon_table: '八边桌',
 }
 */

/**
 * 节点默认数据
 * @type {{id: null, state: string, type: string, tags: number[]}}
 */
const nodeItem = _ => ({
  id: null, state: 'normal', type: 'seat', tags: [], graph: null,
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
  }),
}

const defaultSize = {width: 50, height: 50}

export default {
  name: 'X6Graph',
  props: {
    type: {required: true, validator: value => ['normal', 'custom'].includes(value)},
    rows: {required: true, type: Number, default: 0},
    cols: {required: true, type: Number, default: 0},
    items: {required: true, type: Array},
    config: {type: Object, default: () => ({})},
    tags: {type: Array},
  },

  data() {
    return {
      graph: null,
      dnd: null,
      contextMenu: {x: 0, y: 0, show: false, node: null},
      gradientId: 0,
    }
  },

  watch: {
    '$props.type'(newVal, oldVal) {
      this.cleanGraph()
    },
  },

  computed: {
    nodeTotal() {
      return this.$props.rows * this.$props.cols
    },
    contextMenuConfig() {
      return [
        {
          value: 'state',
          label: '状态',
          children: Object.entries(status).map(item => ({label: item[1], value: item[0]})),
        },
        {
          value: 'tags', label: '标签', children: [
            {
              label: '添加', value: 'add',
              children: this.$props.tags.map(item => ({label: item.title, value: item.id})),
            },
            {label: '清空', value: 'clean'},
          ],
        },
        {
          value: 'del', label: '删除',
        },
      ]
    },
  },

  mounted() {
    this.makeGraphInstance()
    this.listenEvent()
  },

  methods: {
    export() {
      this.graph.getNodes().forEach(n => {
        console.log({
          i: n.id,
          p: n.prop().attrs?.text?.text,
          'd': n.getData(),
        })
      })
    },

    makeSeats() {
      this.graph.clearCells()

      const total = this.nodeTotal
      // 距离最外面的边距
      const padding = 150
      // 每个座位之间的距离
      const gap = defaultSize.width / 2
      // 每个座位的大小
      const size = defaultSize.width

      let rowStep = 0
      let colStep = 0

      for (let i = 0; i < total; i++) {
        // 行标签
        if (colStep === 0) {
          this.graph.addNode({
            shape: 'rect',
            x: 75,
            y: 150 + rowStep * size + rowStep * gap,
            width: size,
            height: size,
            label: getColKey(rowStep),
            attrs: {
              rect: {fill: 'transparent', stroke: null},
              text: {fontSize: '30px', fill: '#676767'},
            },
          })
        }

        if (rowStep === 0) {
          // 列标签
          this.graph.addNode({
            shape: 'rect',
            x: 150 + colStep * size + colStep * gap,
            y: 75,
            width: size,
            height: size,
            label: `${ colStep + 1 }`,
            attrs: {
              rect: {fill: 'transparent', stroke: null},
              text: {fontSize: '30px', fill: '#676767'},
            },
          })
        }

        const attrs = this.getNodeAttrsFromNodeDate(nodeItem())
        attrs.x = padding + colStep * size + colStep * gap
        attrs.y = padding + rowStep * size + rowStep * gap

        this.graph.addNode(attrs)

        // 下一列
        colStep++

        // 下一行
        if (colStep === this.cols) {
          rowStep++
          colStep = 0
        }
      }

      this.resetZoom()
    },

    cleanGraph() {
      this.graph.clearCells()
    },

    handleChooseMenu(context) {
      const [action, value, tag = null] = context
      let nodes = this.graph.getSelectedCells()
      nodes = nodes.length ? nodes : [this.contextMenu.node]

      nodes.forEach(node => {
        // 移除节点
        if (action === 'del') {
          return this.graph.removeNode(node)
        }

        const data = node.getData()
        // 修改状态
        if (action === 'state') {
          data.state = value
        }

        // 添加标签
        else if (action === 'tags' && value === 'add') {
          const idx = data.tags.findIndex(t => tag === t)
          if (idx === -1) {
            data.tags.push(tag)
            data.tags.length > 1 && data.tags.sort()
          }
        }

        // 清空标签
        else if (action === 'tags' && value === 'clean') {
          data.tags = []
        }

        this.updateNodeAttrs(node, data)
      })


      this.graph.resetSelection()
      this.contextMenu.show = false
      this.contextMenu.node = null

      // console.log(this.graph.getNodes())
    },

    handleStartDragItem(evt) {
      const attrs = this.getNodeAttrsFromNodeDate(nodeItem())
      const node = this.graph.createNode(attrs)
      this.dnd.start(node, evt)
    },

    getNextGradientId() {
      this.gradientId++
      return this.gradientId
    },

    getNodeAttrsFromNodeDate(data, size = {}) {
      const width = size.width || defaultSize.width
      const height = size.height || defaultSize.height

      const props = {
        data: data,
        attrs: strokeStyle.normal(size),
        markup: [
          {tagName: 'rect', selector: 'body'},
          {tagName: 'text', selector: 'label'},
        ],
        width: width,
        height: height,
      }

      props.attrs.label.text = ''

      if (['blocked', 'not_show'].includes(data.state)) {
        props.attrs = strokeStyle.dotted(size)
        props.attrs.label.text = status?.[data.state]
      }

      // 标签
      else if (data.state === 'normal' && data.tags?.length) {
        const gradientId = `gradient-id-${ this.getNextGradientId() }`
        props.markup = [
          {
            tagName: 'defs', children: [
              {
                tagName: 'linearGradient', attrs: {id: gradientId, x1: '0%', y1: '0%', x2: '0%', y2: '100%'},
                children: this.getGradientItems(data.tags),
              },
            ],
          },
          {tagName: 'rect', selector: 'body'},
          {tagName: 'text', selector: 'label'},
        ]
        props.attrs.body = {
          stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', width: width, height: height,
          fill: `url(#${ gradientId })`,
        }
      }

      return props
    },

    getGradientItems(ids) {
      const tags = []
      const items = []
      ids.forEach(id => {
        const tag = this.tags.find(t => t.id === id)
        tag && tags.push(tag)
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

    updateNodeAttrs(node, data) {
      const props = this.getNodeAttrsFromNodeDate(data, node.size())
      node.setMarkup(props.markup, {silent: false})
      node.setAttrs(props.attrs, {overwrite: true, silent: false})
      node.replaceData(data, {silent: false})
    },

    hasCovered(node) {
      if (this.graph.getNodesUnderNode(node).length) {
        this.graph.undoAndCancel()
        return true
      }

      return false
    },

    listenEvent() {
      // 右击元素
      this.graph.on('node:contextmenu', ({e, x, y, node, view}) => {
        this.contextMenu.x = e.clientX
        this.contextMenu.y = e.clientY
        this.contextMenu.node = node
        this.contextMenu.show = true
      })

      // 节点添加
      this.graph.on('node:added', ({node}) => {
        if (this.graph.getNodesUnderNode(node).length) {
          return this.graph.removeNode(node)
        }
      })

      // 移动
      this.graph.on('node:moved', ({e, x, y, node, view}) => {
        this.hasCovered(node)
      })

      // 缩放
      this.graph.on('node:resized', ({e, x, y, node, view}) => {
        this.hasCovered(node)

        this.updateNodeAttrs(node, node.getData())
      })
    },

    resetZoom() {
      this.graph.zoomToFit({maxScale: 0.8})
      this.graph.centerContent()
    },

    getGraphConfig() {
      const defaultConfig = {
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
        interacting: { // 节点拖动
          nodeMovable: () => true,
        },
        translating: { // 限制节点移动范围
          restrict: true,
        },
      }
      return merge(defaultConfig, this.config)
    },

    makeGraphInstance() {
      // console.log(this.getGraphConfig())
      this.graph = new Graph({
        container: this.$refs.graph,
        ...this.getGraphConfig(),
      })

      // 框选
      this.graph.use(new Selection({
        enabled: true,
        multiple: false,
        rubberband: true,
        movable: () => this.type === 'custom',
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
        pointerEvents: 'none',
        strict: false,
        className: 'x-selector',
        modifiers: ['shift'],
        // filter: (cell) => cell.getData()?.id !== undefined,
      }))

      // 调整大小
      this.graph.use(new Transform({
        resizing: {
          enabled: () => this.type === 'custom',
          minWidth: 50,
          minHeight: 50,
          preserveAspectRatio: true,
          restrict: false,
          autoScroll: true,
        },
        rotating: {
          enabled: false,
        },
      }))

      // 对齐线
      this.graph.use(new Snapline({
        enabled: true,
        resizing: true,
        tolerance: 5,
        filter: (graph, node) => true,
      }))

      // dnd
      this.dnd = new Dnd({
        target: this.graph,
        dndContainer: this.$refs.dndContainer,
        getDragNode: (node) => node.clone({keepId: true}),
        getDropNode: (node) => node.clone({keepId: true}),
        validateNode: (node, options) => true,
      })

      // 历史记录
      this.graph.use(new History({enabled: true}))
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

.x-dnd-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 20px;
  user-select: none;

  .dnd-item {
    width: 50px;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: move;
    border: 1px solid #ddd;
    background: #eee;
  }
}
</style>
