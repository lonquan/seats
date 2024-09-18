<template>
  <div class="graph-container" ref="container">
    <div class="graph-canvas" ref="graph"></div>
  </div>
</template>

<script>
/* eslint-disable */
import {Graph} from '@antv/x6'
import {Scroller} from '@antv/x6-plugin-scroller'
import {debounce, merge} from 'lodash'
import {status, strokeStyle} from '@/config'
import select from '@/assets/select.svg'

export default {
  name: 'BookingGraph',

  props: {
    tags: {type: Array},
    bookingStatus: {type: Array},
  },

  computed: {
    bookingColors() {
      return this.$props.bookingStatus.reduce((carry, current) => {
        carry[current.id] = current.color

        return carry
      }, {})
    },
  },

  data() {
    return {
      graph: null,
      hammer: null,
      scalingRatio: 1,
      selectedId: null,
      lastSelect: {
        id: null,
        title: null,
      },
    }
  },

  mounted() {
  },

  destroyed() {
    this.graph?.dispose(true)
  },

  methods: {
    setSelectedId(currentId) {
      this.selectedId = currentId

      const node = this.graph.getCellById(currentId)

      console.log(node.getAttrs(), node.getMarkup())

      if (!node.isNode()) {
        return
      }

      node.setAttrs({
        body: {fill: '#FF624B'},
        label: {text: ''},
        image: {
          'xlink:href': select,
          refX: 0.5,
          refY: 0.5,
          xAlign: 'middle',
          yAlign: 'middle',
          refWidth: 0.6,
          refHeight: 0.6,
          display: 'inline',
        },
      })

      if (this.lastSelect.id) {
        const last = this.graph.getCellById(this.lastSelect.id)

        last.setAttrs({
          body: {fill: '#ffffff'},
          label: {text: this.lastSelect.title},
          image: {
            display: 'none',
          },
        })
      }

      const {id, title} = node.getData()

      this.lastSelect = {id, title}
    },

    filterTags(ids) {
      const nodes = this.graph.getNodes()
      const empty = ids.length === 0

      nodes.forEach(node => {
        if (empty) {
          return node.show()
        }

        const {type, tags} = node.getData()

        if (type === 'seat') {
          const exists = ids.every(t => tags.includes(t))

          exists ? node.show() : node.hide()
        }
      })
    },

    setGraphZoom() {
      this.graph.zoomToFit()
      this.graph.centerContent()
      this.graph.zoom(-0.01)
    },

    getNodeAttrsFromNodeDate(data, size = {}) {
      const width = size.width
      const height = size.height

      const props = {
        shape: 'rect',
        data: data,
        attrs: strokeStyle.normal(size),
        markup: [
          {tagName: 'rect', selector: 'body'},
          {tagName: 'text', selector: 'label'},
          {tagName: 'image', selector: 'image'},
        ],
        width: width,
        height: height,
        x: size.x,
        y: size.y,
      }

      props.attrs.label.text = data.title || ''
      props.attrs.body.stroke = '#DCDCDC'

      props.attrs.body.fill = this.bookingColors?.[data.booking_state] || props.attrs.body.fill

      if (['blocked'].includes(data.state)) {
        props.attrs = strokeStyle.dotted(size)
        props.attrs.label.text = status?.[data.state]
      }

      return props
    },

    renderNormalSeat(seats) {
      seats.forEach(node => {
        if (node.state === 'not_show') {
          return
        }

        let props

        if (node.type !== 'seat') {
          props = {
            shape: 'rect',
            x: node.graph.x,
            y: node.graph.y,
            width: node.graph.width,
            height: node.graph.height,
            label: node.title,
            attrs: {
              rect: {fill: 'transparent', stroke: null},
              text: {fontSize: '30px', fill: '#676767'},
            },
            data: node,
          }
        } else {
          props = this.getNodeAttrsFromNodeDate(node, node.graph)
        }

        props.id = node.id
        this.graph.addNode(props)
      })

      this.$nextTick(_ => {
        this.setGraphZoom()
      })
    },

    make(seats) {
      console.log('making...')
      if (this.graph) {
        this.graph.dispose(true)
      }

      const widht = seats.width || 800
      const height = seats.height || 600

      this.scalingRatio = this.$refs.graph.offsetWidth / widht

      const size = {
        height: this.scalingRatio * height,
        width: this.$refs.graph.offsetWidth,
      }

      this.init(size)

      this.renderNormalSeat(seats.items)
    },

    handleNodeClick({e, x, y, node, view}) {
      const data = node.getData()

      if (data.type === 'seat') {
        this.$emit('select', data)
      }
    },

    startListenEvent() {
      console.log('listening...')

      this.graph.on('node:click', debounce(
          evt => this.handleNodeClick(evt),
          500,
          {'leading': true, 'trailing': false}),
      )
    },

    init(size = {width: 800, height: 600}) {
      console.log('initializing...')

      this.graph = new Graph({
        container: this.$refs.graph,
        ...this.getGraphConfig(size),
      })

      this.graph.use(new Scroller({
        pannable: true, pageVisible: false, pageBreak: false,
      }))

      this.startListenEvent()
    },

    getGraphConfig(size) {
      const defaultConfig = {
        background: {color: '#fff'},
        // autoResize: true,
        width: size.width,
        height: size.height,
        grid: false,
        panning: false,
        mousewheel: false,
        interacting: false,
        translating: false,
      }

      return merge(defaultConfig, {})
    },
  },
}
</script>

<style scoped lang="scss">
.graph-container {
  padding: 0 20px;

  .x6-graph {
    //touch-action: auto !important;
  }
}
</style>

<style lang="scss">
.x6-graph-scroller {
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  /* 隐藏滚动条滑块 */
  &::-webkit-scrollbar-thumb {
    background: transparent;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>
