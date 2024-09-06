<template>
  <div class="x-container">
    <div class="x-dnd-wrap" ref="dndContainer" v-show="graphType === 'custom'">
      <div class="dnd-item" @mousedown="evt => handlerStartDragItem(evt)"></div>
    </div>

    <div class="x-container" ref="container" :style="style">
      <div class="x-canvas" ref="graph"></div>
    </div>

    <div class="x-menu" v-if="contextMenu.show">
      <div class="x-menu-maks" @click="contextMenu.show = false"></div>
      <div class="x-menu-list" :style="{top: `${contextMenu.y}px`, left: `${contextMenu.x}px`}">
        <el-cascader-panel
            :props="{expandTrigger: 'hover', multiple: false}"
            :options="contextMenuConfig"
            @change="handlerChooseMenu"
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
 octagon_table: '八边桌',
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
    background: {type: Object, default: () => ({url: null, width: null, height: null})},
    tags: {type: Array},
  },

  data() {
    return {
      graphType: '',
      nodeTotal: 0,
      graph: null,
      dnd: null,
      contextMenu: {x: 0, y: 0, show: false, node: null},
      gradientId: 0,
      style: {},
    }
  },

  computed: {
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

  methods: {
    export() {
      return {
        type: this.graphType,
        total: this.nodeTotal,
        rows: this.$props.rows,
        cols: this.$props.cols,
        items: this.graph.getNodes().map(node => {
          const data = node.getData()
          const position = node.position()
          const size = node.size()

          data.graph = {
            ...position, ...size,
          }

          return data
        }),
        background: this.$props.background,
      }
    },

    make(restore = false) {
      this.graphType = this.$props.type

      if (this.graph == null) {
        this.init()
      }

      if (restore) {
        this.restoreSavedItems()
      } else {
        this.cleanGraph()

        this.graphType === 'custom' && this.makeCustomGraph()
        this.graphType === 'normal' && this.makeNormalGraph()
      }

      this.resetZoom()
    },

    init() {
      this.makeGraphInstance()
      this.listenEvent()
    },

    restoreSavedItems() {
      if (this.graphType === 'custom') {
        this.makeCustomGraph()
      }

      this.$props.items.forEach(data => {
        const attrs = this.getNodeAttrsFromNodeDate(data, data.graph)
        this.graph.addNode(attrs)
      })
    },

    makeCustomGraph() {
      if (this.background.url) {
        this.graph.hideGrid()

        this.graph.drawBackground({
          image: this.background.url,
          position: 'center',
          size: '100% 100%',
        })
      }
    },

    makeNormalGraph() {
      this.graph.showGrid()
      this.graph.clearBackground()

      const total = this.nodeTotal = this.$props.rows * this.$props.cols
      // 距离最外面的边距
      const padding = 150
      // 每个座位之间的距离
      const gap = defaultSize.width / 2
      // 每个座位的大小
      const size = defaultSize.width

      let rowStep = 0
      let colStep = 0

      let rowTitle, colTitle
      for (let i = 0; i < total; i++) {
        // 行标签
        if (colStep === 0) {
          rowTitle = getRowKey(rowStep)
          this.graph.addNode({
            shape: 'rect',
            x: 75,
            y: 150 + rowStep * size + rowStep * gap,
            width: size,
            height: size,
            label: rowTitle,
            attrs: {
              rect: {fill: 'transparent', stroke: null},
              text: {fontSize: '30px', fill: '#676767'},
            },
            data: nodeItem('row_title', rowTitle),
          })
        }

        colTitle = `${ colStep + 1 }`
        if (rowStep === 0) {
          // 列标签
          this.graph.addNode({
            shape: 'rect',
            x: 150 + colStep * size + colStep * gap,
            y: 75,
            width: size,
            height: size,
            label: colStep + 1,
            attrs: {
              rect: {fill: 'transparent', stroke: null},
              text: {fontSize: '30px', fill: '#676767'},
            },
            data: nodeItem('col_title', colTitle),
          })
        }

        const attrs = this.getNodeAttrsFromNodeDate(nodeItem('seat', `${ colTitle }${ rowTitle }`))
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
    },

    cleanGraph() {
      this.graph.clearCells()
      this.graph.clearBackground()
    },

    handlerChooseMenu(context) {
      const [action, value, tag = null] = context
      let nodes = this.graph.getSelectedCells()
      nodes = nodes.length ? nodes : [this.contextMenu.node]

      nodes.forEach(node => {
        const data = node.getData()
        if (data.type !== 'seat') {
          return
        }

        // 移除节点
        if (action === 'del') {
          return this.graph.removeNode(node)
        }

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

    handlerStartDragItem(evt) {
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

      if (Number.isFinite(size.x) && Number.isFinite(size.y)) {
        props.x = size.x
        props.y = size.y
      }

      props.attrs.label.text = data.title || ''

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
        if (node.getData()?.type !== 'seat') {
          return
        }

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
      // this.graph.zoomToFit({maxScale: 0.8})
      this.graph.centerContent()
    },

    getGraphConfig() {
      const defaultConfig = {
        background: {color: '#F2F7FA'},
        // autoResize: true,
        width: 800,
        height: 600,
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
          enabled: this.graphType !== 'custom',
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
        movable: () => true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
        pointerEvents: 'none',
        strict: true,
        className: 'x-selector',
        modifiers: ['shift'],
        // filter: (cell) => cell.getData()?.id !== undefined,
      }))

      // 调整大小
      this.graph.use(new Transform({
        resizing: {
          enabled: () => this.graphType === 'custom',
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
