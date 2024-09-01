<template>
  <div id="app">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card header="座位图">
          <el-alert :closable="false">
            <p>保存后不可修改位置, 仅可修改属性</p>
            <p>切换类型会清空已有数据</p>
            <p>异形仅方形可设置为座位, 其他均为桌位</p>
          </el-alert>

          <el-alert :closable="false">
            <p>space＋鼠标左键＝拖动</p>
            <p>alt＋鼠标左键＝缩放</p>
            <p>shift＋鼠标左键＝框选</p>
          </el-alert>
          <div style="padding-top: 20px; height: 70vh;">
            <X6Graph
                ref="x6"
                v-bind="graph"
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

            <template v-if="layout.type === 'normal'">
              <el-form-item label="横排数量">
                <el-input-number v-model="layout.rows" :min="1"/>
              </el-form-item>

              <el-form-item label="竖排数量">
                <el-input-number v-model="layout.cols" :min="1"/>
              </el-form-item>
            </template>

            <el-form-item label="">
              <el-button @click="handleCalculateLayout">确定</el-button>
              <el-button @click="handleSave">保存</el-button>
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

import bg from '@/assets/bg.jpg'

export default {
  name: 'App',
  components: {
    X6Graph,
  },

  computed: {
    graph() {
      return {
        type: this.layout.type,
        rows: this.layout.rows,
        cols: this.layout.cols,
        items: this.layout.items,
        config: this.config,
        tags: [
          {id: 1, title: '安静', color: '#37A0FB'},
          {id: 2, title: '阳光', color: '#F6B25F'},
          {id: 3, title: '舒适', color: '#43BC69'},
        ],
      }
    },
  },

  data() {
    return {
      layout: {
        type: 'shape', rows: 4, cols: 6, items: [],
      },
      config: {
        /* x6 config */
        // @see https://x6.antv.antgroup.com/api/graph/background
        background: {color: '#F2F7FA', image: bg},
      },
    }
  },

  created() {
  },

  methods: {
    handleSave() {
      console.log(this.$refs.x6.handleExport())

      console.log(JSON.stringify(this.$refs.x6.handleExport()))
    },

    handleCalculateLayout() {
      // 确认数量后, 手动画
      this.$refs.x6.draw()
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
