<template>
  <div class="x-container">
    <div class="x-dnd-wrap" ref="dndContainer" v-show="type === 'shape'">
      <div
          v-for="i in dndNodes"
          class="dnd-item"
          :class="`dnd-${i.key}`"
          :key="i.key"
          @mousedown="evt => handleStartDragItem(i.key, evt)"
      >{{ i.label }}
      </div>
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
import {cloneDeep, merge} from 'lodash'

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
const createStatus = {
  available: '正常', blocked: '不可用', not_show: '不显示',
}

/**
 * 节点类型
 * @type {{seat: string, passage: string, table: string}}
 */
const types = {
  seat: '座位', passage: '通道', table: '桌子',
}

/**
 * 节点默认数据
 * @type {{index: null, id: null, state: string, type: string, tags: *[]}}
 */
const nodeData = {
  id: null, state: 'available', type: 'seat', tags: [], index: null, shape_type: 'normal',
}

/**
 * 可拖动的节点配置
 */
const dndNodes = [
  {
    key: 'square', label: '正方形', data: {shape: 'rect', width: 50, height: 50},
  },
  {
    key: 'circle', label: '圆形', data: {shape: 'circle', width: 50, height: 50},
  },
  {
    key: 'rectangle', label: '长方形', data: {shape: 'rect', width: 100, height: 50},
  },
  {
    key: 'hexagon', label: '六边形', data: {
      shape: 'polygon', width: 50, height: 50,
      points: '25,0 50,12.5 50,37.5 25,50 0,37.5 0,12.5',
    },
  },
  {
    key: 'octagon', label: '八边形', data: {
      shape: 'polygon', width: 50, height: 50,
      points: '14.64,0 35.36,0 50,14.64 50,35.36 35.36,50 14.64,50 0,35.36 0,14.64',
    },
  },
]

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
      dnd: null,
      contextMenu: {x: 0, y: 0, show: false, node: null},
      nodes: [],
    }
  },

  watch: {
    '$props.rows'() {
      this.nodes = []
    },
    '$props.cols'() {
      this.nodes = []
    },
    '$props.type'(newVal, oldVal) {
      this.graph.clearCells()
      this.nodes = []
    },
  },

  computed: {
    nodeTotal() {
      return this.$props.rows * this.$props.cols
    },
    dndNodes() {
      return dndNodes
    },
    contextMenuConfig() {
      return [
        {
          value: 'type', label: '类型',
          disabled: this.type === 'shape',
          children: Object.entries(types).map(item => ({label: item[1], value: item[0]})),
        },
        {
          value: 'state',
          label: '状态',
          children: Object.entries(createStatus).map(item => ({label: item[1], value: item[0]})),
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
          value: 'del', label: '删除', disabled: this.type === 'normal',
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
    blockedNodeAttr() {
      return {
        rect: {stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', strokeDasharray: '5.5'},
        label: '不可用',
      }
    },
    notShowNodeAttr() {
      return {
        rect: {stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', strokeDasharray: '5.5'},
        label: '不显示',
      }
    },
    tableNodeAttr() {
      return {
        rect: {stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', strokeDasharray: '5.5'},
        label: '桌',
      }
    },
  },

  mounted() {
    this.nodes = this.$props.items
    this.makeGraphInstance()
    this.nodes.length && this.draw()
    this.listenEvent()
    // this.resetZoom()
  },

  methods: {
    handleExport() {
      const {rows, cols, type} = this.$props

      return {
        rows, cols, type, total: this.nodeTotal,
        items: this.nodes,
      }
    },

    handleStartDragItem(type, evt) {
      const dnd = this.dndNodes.find(i => i.key === type)
      const dndData = cloneDeep(dnd.data)
      const data = merge(cloneDeep(nodeData), {
        shape_type: type,
        type: type == 'square' ? 'seat' : 'table',
      })

      const props = this.getNewShapeNodeProps(data, dndData)

      console.log(props)
      const node = this.graph.createNode(props)
      data.index = node.id
      node.setData(data)

      this.nodes.push(node.getData())
      this.dnd.start(node, evt)
    },

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
      const [action, value, tag = null] = val
      let cells = this.graph.getSelectedCells()

      cells = cells.length ? cells.map(c => c.getData()) : [this.contextMenu.node]

      cells.forEach(cell => {
        const nodeIdx = this.nodes.findIndex(n => n.index === cell.index)
        // 移除节点
        if (action === 'del') {
          this.graph.removeCell(cell.index)
          this.nodes.splice(nodeIdx, 1)
        }

        // 类型选择, 修改状态
        if (['type', 'state'].includes(action)) {
          this.$set(this.nodes[nodeIdx], action, value)
        }

        // 添加标签
        if (action === 'tags' && value === 'add') {
          const tags = this.nodes[nodeIdx].tags
          const tagIdx = tags.findIndex(t => t === tag)

          if (tagIdx === -1) {
            tags.push(tag)
            tags.sort()
          }

          this.$set(this.nodes[nodeIdx], 'tags', tags)
        }

        // 清空标签
        if (action === 'tags' && value === 'clean') {
          this.$set(this.nodes[nodeIdx], 'tags', [])
        }
      })

      this.graph.resetSelection()
      this.contextMenu.show = false
      this.contextMenu.node = null

      this.$nextTick(_ => {
        this.draw()
      })
    },

    draw() {
      this.type === 'normal' && this.drawNormalGraph()
      this.type === 'shape' && this.drawShapeGraph()

      this.$nextTick(_ => this.type === 'normal' && this.resetZoom())
    },

    getNewShapeNodeProps(node, attrs) {
      console.log(node, attrs)
      const props = cloneDeep(attrs)

      props.attrs = {
        body: {strokeWidth: '1px', rx: '6px', ry: '6px', stroke: '#676767'},
      }

      // 过道样式
      if (node.type === 'passage') {
        props.label = this.passageNodeAttr.label
        props.attrs.body = this.passageNodeAttr.rect
      }

      // 课桌
      if (node.type === 'table') {
        props.label = this.tableNodeAttr.label
        props.attrs.body = this.tableNodeAttr.rect
      }

      // 座位, 不可用
      if (node.type === 'seat' && node.state === 'blocked') {
        props.label = this.blockedNodeAttr.label
        props.attrs.body = this.blockedNodeAttr.rect
      }

      // 座位, 不显示
      if (node.type === 'seat' && node.state === 'not_show') {
        props.label = this.notShowNodeAttr.label
        props.attrs.body = this.notShowNodeAttr.rect
      }

      // 标签
      if (node.type === 'seat' && node.tags.length) {
        const gradientItems = this.getGradientItems(node.tags)
        const gradientId = `gradient-idx-${ node.index }`
        props.markup = [
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
        props.attrs.tags = {
          stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', width: props.width, height: props.height,
          fill: `url(#${ gradientId })`,
        }
      }

      return props
    },

    getNewNodeProps(node, width, height) {
      const nodeProp = {
        label: null,
        markup: [
          {tagName: 'rect', selector: 'body'},
          {tagName: 'text', selector: 'label'},
        ],
        attrs: {
          body: {strokeWidth: '1px', rx: '6px', ry: '6px', stroke: '#676767'},
          label: {fontSize: '12px'},
        },
      }

      // 过道样式
      if (node.type === 'passage') {
        nodeProp.label = this.passageNodeAttr.label
        nodeProp.attrs.body = this.passageNodeAttr.rect
      }

      // 课桌
      if (node.type === 'table') {
        nodeProp.label = this.tableNodeAttr.label
        nodeProp.attrs.body = this.tableNodeAttr.rect
      }

      // 座位, 不可用
      if (node.type === 'seat' && node.state === 'blocked') {
        nodeProp.label = this.blockedNodeAttr.label
        nodeProp.attrs.body = this.blockedNodeAttr.rect
      }

      // 座位, 不显示
      if (node.type === 'seat' && node.state === 'not_show') {
        nodeProp.label = this.notShowNodeAttr.label
        nodeProp.attrs.body = this.notShowNodeAttr.rect
      }

      // 标签
      if (node.type === 'seat' && node.tags.length) {
        const gradientItems = this.getGradientItems(node.tags)
        const gradientId = `gradient-idx-${ node.index }`
        nodeProp.markup = [
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
        nodeProp.attrs.tags = {
          stroke: '#676767', strokeWidth: '1px', rx: '6px', ry: '6px', width: width, height: height,
          fill: `url(#${ gradientId })`,
        }
      }

      return cloneDeep(nodeProp)
    },

    drawShapeGraph() {
      console.clear()
      const nodesModel = this.graph.getNodes()

      this.nodes.forEach(node => {
        const nodeModel = nodesModel.find(nm => nm.id === node.index)

        if (!nodeModel) {
          return
        }

        const {size, position} = nodeModel.prop()
        const dnd = this.dndNodes.find(i => i.key === node.shape_type)
        const _position = {
          width: size.width,
          height: size.height,
          x: position.x,
          y: position.y,
        }
        const props = this.getNewShapeNodeProps(node, merge(cloneDeep(dnd.data), _position))

        const newNode = this.graph.createNode(props)
        node.index = newNode.id
        node.position = _position
        newNode.setData(node)
        console.log('getData', newNode.getData())
        this.graph.removeCell(nodeModel.id)
        this.graph.addNode(newNode, {silent: false})
      })

      console.log('nodes', this.nodes)
    },

    drawNormalGraph() {
      // 修剪到指定长度
      this.nodes.splice(this.nodeTotal)
      // 需要填充的长度
      const pad = this.nodeTotal - this.nodes.length

      if (pad > 0) {
        for (let r = 0; r < pad; r++) {
          this.nodes.push(cloneDeep(nodeData))
        }
      }

      // 清空画布
      this.graph.clearCells()
      // 距离最外面的边距
      const padding = 150
      // 每个座位之间的距离
      const gap = 25
      // 每个座位的大小
      const size = 50

      let rowStep = 0
      let colStep = 0

      this.nodes.forEach((item, index) => {
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

        const props = this.getNewNodeProps(item, size, size)

        const nodeStats = {
          shape: 'rect',
          y: padding + rowStep * size + rowStep * gap,
          x: padding + colStep * size + colStep * gap,
          width: size,
          height: size,
          data: item,
          label: props.label,
          markup: props.markup,
          attrs: props.attrs,
        }

        // 添加到画布
        const node = this.graph.addNode(nodeStats)
        item.index = node.id
        node.setData(item, {overwrite: true, silent: true})

        // 下一列
        colStep++

        // 下一行
        if (colStep === this.cols) {
          rowStep++
          colStep = 0
        }
      })
    },

    listenEvent() {
      // 右击元素
      this.graph.on('node:contextmenu', ({e, x, y, node, view}) => {
        // console.log('node:contextmenu', node.getData())
        this.contextMenu.x = e.clientX
        this.contextMenu.y = e.clientY
        this.contextMenu.node = node.getData()
        this.contextMenu.show = true
      })

      // 添加节点
      this.graph.on('node:added', ({node}) => {
        // if (this.type === 'shape') {
        //   const data = node.getData()
        //   this.nodes.push(data)
        //   // console.log(this.nodes)
        // }
      })

      this.graph.on('node:resized', _ => {
        this.draw()
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
          nodeMovable: () => this.type === 'shape',
        },
        translating: { // 限制节点移动范围
          restrict: true,
        },
      }
      return merge(defaultConfig, this.config)
    },

    makeGraphInstance() {
      console.log(this.getGraphConfig())
      this.graph = new Graph({
        container: this.$refs.graph,
        ...this.getGraphConfig(),
      })

      // 框选
      this.graph.use(new Selection({
        enabled: true,
        multiple: false,
        rubberband: true,
        movable: () => this.type === 'shape',
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
        pointerEvents: 'none',
        strict: false,
        className: 'x-selector',
        modifiers: ['shift'],
        filter: (cell) => cell.getData()?.id !== undefined,
      }))

      // 调整大小
      this.graph.use(new Transform({
        resizing: {
          enabled: () => this.type === 'shape',
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
