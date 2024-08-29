<template>
  <div id="app">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card header="座位图">
          <el-alert :closable="false">
            <p>space＋鼠标左键＝拖动</p>
            <p>alt＋鼠标左键＝缩放</p>
            <p>shift＋鼠标左键＝框选</p>
          </el-alert>
          <div style="padding-top: 20px; height: 70vh;">
            <X6Graph
                ref="x6"
                v-bind="graph"
                @command="handleCommand"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card header="参数">
          <el-form label-width="100px">
            <el-form-item label="类型">
              <el-radio-group v-model="layout.type">
                <el-radio label="normal">普通</el-radio>
                <el-radio label="shape">自定义</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="横排数量">
              <el-input-number v-model="layout.rows" :min="1"/>
            </el-form-item>

            <el-form-item label="竖排数量">
              <el-input-number v-model="layout.cols" :min="1"/>
            </el-form-item>

            <el-form-item label="">
              <el-button @click="handleCalculateLayout">确定</el-button>
            </el-form-item>

          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
/* eslint-disable */
import X6Graph from '@/components/X6Graph.vue'
import Seat from '@/composables/seat'
import {tags} from '@/composables/seat/config'

export default {
  name: 'App',
  components: {
    X6Graph,
  },

  computed: {
    graph() {
      return {
        // @see https://x6.antv.antgroup.com/api/graph/graph
        config: {},
        ...this.layout,
        tags,
      }
    },
  },

  data() {
    return {
      layout: Seat.makeLayout(),
      config: {},
    }
  },

  created() {
  },

  methods: {
    handleCommand(command) {
      command.cells.forEach(cell => {
        const {row, column} = cell
        const [action, value, tag = null] = command.action

        // 修改类型
        if (action === 'type') {
          this.layout.items[row][column].type = value
        }

        // 修改状态
        if (action === 'state') {
          this.layout.items[row][column].state = value
        }

        // 添加标签
        if (action === 'tags' && value === 'add') {
          const item = this.layout.items[row][column]
          const index = this.layout.items[row][column].tags.findIndex(t => t === tag)

          if (index === -1) {
            item.tags.push(tag)
            item.tags.sort()
          }
        }

        // 清空标签
        if (action === 'tags' && value === 'clean') {
          this.layout.items[row][column].tags = []
        }
      })

      this.$nextTick(_ => this.$refs.x6.draw())
    },

    handleCalculateLayout() {
      this.layout.items = Seat.calcItems(this.layout)

      // 手动画, 防止效率问题
      this.$nextTick(_ => {
        this.$refs.x6.draw()
        this.$refs.x6.resetZoom()
      })
    },
  },
}
</script>

<style lang="scss">
* {
  padding: 0;
  margin: 0;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  //width: 1920px;
  margin: 0 auto;
  padding-top: 20px;
}
</style>
