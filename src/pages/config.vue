<template>
  <el-row :gutter="20">
    <el-col :span="18">
      <el-card header="座位图">
        <el-alert :closable="false">
          <p>保存后不可修改位置, 仅可修改属性</p>
          <p>切换类型会清空已有数据</p>
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
              <el-radio label="custom">自定义</el-radio>
            </el-radio-group>
          </el-form-item>

          <template v-if="layout.type === 'custom'">
            <el-form-item label="背景图">
              <el-upload
                  class="avatar-uploader"
                  action="https://jsonplaceholder.typicode.com/posts/"
                  :show-file-list="false"
                  :before-upload="handlerImageChange"
              >
                <i class="el-icon-plus"></i>
              </el-upload>
            </el-form-item>
          </template>

          <template v-if="layout.type === 'normal'">
            <el-form-item label="横排数量">
              <el-input-number v-model="layout.rows" :min="1"/>
            </el-form-item>

            <el-form-item label="竖排数量">
              <el-input-number v-model="layout.cols" :min="1"/>
            </el-form-item>
          </template>

          <el-form-item label="">
            <el-button @click="handlerCalculateLayout">生成</el-button>
            <el-button @click="handlerSave">保存</el-button>
          </el-form-item>

          <el-form-item label="">
            <el-button @click="handlerImport('normal')">加载普通</el-button>
            <el-button @click="handlerImport('custom')">加载自定义</el-button>
          </el-form-item>

        </el-form>
      </el-card>
    </el-col>
  </el-row>
</template>

<script>
/* eslint-disable */
import X6Graph from '@/components/X6Graph.vue'
import mock from '@/data'

export default {
  name: 'config',
  components: {X6Graph},

  data() {
    return {
      layout: {
        type: 'custom', rows: 4, cols: 6, items: [],
        url: '/bg.jpg', width: null, height: null,
      },
      config: {
        /* x6 config */
        // @see https://x6.antv.antgroup.com/api/graph/background
        // background: {color: '#F2F7FA', image: bg},
      },
    }
  },

  computed: {
    graph() {
      return {
        type: this.layout.type,
        rows: this.layout.rows,
        cols: this.layout.cols,
        items: this.layout.items,
        background: {
          url: this.layout.url,
          width: this.layout.width,
          height: this.layout.height,
        },
        config: this.config,
        tags: [
          {id: 1, title: '安静', color: '#37A0FB'},
          {id: 2, title: '阳光', color: '#F6B25F'},
          {id: 3, title: '舒适', color: '#43BC69'},
        ],
      }
    },
  },

  methods: {
    getImageSize(file) {
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file)

        const img = new Image()

        img.onload = function() {
          const width = this.width
          const height = this.height
          // URL.revokeObjectURL(objectUrl)
          resolve({width: width, height: height, url: objectUrl})
        }

        img.src = objectUrl
      })
    },

    handlerImageChange(file) {
      this.getImageSize(file).then(size => {
        this.layout.width = size.width
        this.layout.height = size.height
        this.layout.url = size.url
      })

      return Promise.reject()
    },

    handlerSave() {
      const data = this.$refs.x6.export()
      console.log(data)
      console.log(JSON.stringify(data))
    },

    handlerCalculateLayout() {
      this.$refs.x6.make()
    },

    handlerImport(type) {
      if (type === 'normal') {
        this.layout.type = mock.normal.type
        this.layout.cols = mock.normal.cols
        this.layout.rows = mock.normal.rows
        this.layout.items = mock.normal.items

        this.$nextTick(_ => {
          this.$refs.x6.make(true)
        })
      }

      if (type === 'custom') {
        this.layout.type = mock.custom.type
        this.layout.items = mock.custom.items
        this.layout.url = '/bg.jpg'
        this.layout.width = mock.normal.background.width
        this.layout.height = mock.custom.background.height

        this.$nextTick(_ => {
          this.$refs.x6.make(true)
        })
      }
    },
  },
}
</script>

<style scoped lang="scss">
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 50px;
  height: 50px;
}

.avatar-uploader .el-upload:hover {
  border-color: #3066E1;
}

</style>
