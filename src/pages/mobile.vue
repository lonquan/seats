<template>
  <div class="mobile-screen">
    <div class="form">
      <div class="cell">
        <div class="label">预约类型</div>
        <div class="value">
          <div class="btn-select">
            <div
                class="item"
                :class="[booking.type === 'single'? 'selected': '']"
                @click="booking.type = 'single'"
            >单次
            </div>
            <div
                class="item"
                :class="[booking.type === 'period'? 'selected': '']"
                @click="booking.type = 'period'"
            >周期性
            </div>
          </div>
        </div>
      </div>

      <div class="cell">
        <div class="label">预约范围</div>
        <div class="value">
          <div class="radio-select">
            <div
                class="item"
                :class="[booking.scope === 'seat'? 'selected': '']"
                @click="booking.scope = 'seat'"
            >
              <div class="circle"></div>
              <div>座位</div>
            </div>
            <div
                class="item"
                :class="[booking.scope === 'venue'? 'selected': '']"
                @click="booking.scope = 'venue'"
            >
              <div class="circle"></div>
              <div>场地</div>
            </div>
          </div>
        </div>
      </div>

      <div class="cell">
        <div class="label">预约日期</div>
        <div class="value" @click="picker.date = true">
          <div class="date-pick">
            <div v-if="booking.date">{{ booking.date }}</div>
            <div v-else class="placeholder">请选择</div>
          </div>
        </div>
      </div>

      <div class="cell" v-if="booking.type === 'period'">
        <div class="label">循环日</div>
        <div class="value" @click="picker.days = true">
          <div class="date-pick days-pick">
            <div v-if="booking.days.length" class="days">
              <div v-for="d in booking.days" :key="d">
                <van-tag type="primary" color="#ffffff" text-color="#000">
                  {{ api.days.find(i => i.id == d)?.name }}
                </van-tag>
              </div>
            </div>
            <div v-else class="placeholder">请选择</div>
          </div>
        </div>
      </div>

      <div class="cell">
        <div class="label">预约时间</div>
        <div class="value" @click="picker.time = true">
          <div class="date-pick">
            <div v-if="booking.begin_time">{{ booking.begin_time }} - {{ booking.end_time }}</div>
            <div v-else class="placeholder">请选择</div>
          </div>
        </div>
      </div>
    </div>

    <div class="maps">
      <div class="tools">
        <div class="filter">
          <div class="item" v-for="t in api.tags" :key="t.id" @click="_ => handleFilterTag(t.id)">
            <div class="icon" :class="t.icon"></div>
            <div class="tit" :style="{ color: picker.tagIds.includes(t.id) ? t.color : null }">{{ t.title }}</div>
          </div>
        </div>

        <div class="scale">
          <div class="item">
            <div class="tit" @click="handleScaling(0.1)">放大</div>
          </div>

          <div class="item">
            <div class="tit" @click="handleScaling(-0.1)">缩小</div>
          </div>
        </div>
      </div>

      <div>
        <BookingGraph
            ref="graph"
            :tags="api.tags"
            :booking-status="api.bookingStatus"
            @select="handleSelectSeat"
        />
      </div>
    </div>

    <div class="footer">
      <div class="status">
        <div class="item" v-for="state in api.bookingStatus" :key="state.id">
          <div
              class="color"
              :class="[state.color ? 'border-none' : '']"
              :style="[state.color ? {background: state.color} : {}]"
          ></div>
          <div class="tit">
            <div>{{ state.title }}</div>
            <div v-if="state.desc">{{ state.desc }}</div>
          </div>
        </div>
      </div>

      <van-button color="#3066E1" round block @click="handleConfirm" :disabled="!booking.seat_id">确定</van-button>
    </div>

    <van-calendar
        title="选择预约日期"
        v-model="picker.date"
        color="#3066E1"
        confirm-text="确认"
        @confirm="handleDateSelect"
    />

    <van-popup v-model="picker.days" round position="bottom">
      <van-checkbox-group v-model="booking.days">
        <van-cell-group inset title="选择循环日">
          <van-cell
              v-for="(d, i) in api.days"
              :key="d.id"
              :title="d.name"
              @click="handleSelectDays(i)"
              clickable
          >
            <template #right-icon>
              <van-checkbox :name="d.id" ref="checkboxes"/>
            </template>
          </van-cell>
        </van-cell-group>
      </van-checkbox-group>
      <div style="padding: 16px;">
        <van-button color="#3066E1" round block @click="handleSelectedDays">确定</van-button>
      </div>
    </van-popup>

    <van-popup v-model="picker.time" round position="bottom" @closed="handlePopupClosed">
      <div style="height: 20px;"></div>
      <van-tabs v-model="picker.step" animated type="card" color="#3066E1">
        <van-tab name='begin' title="开始时间">
          <van-datetime-picker
              type="time"
              :min-hour="api.begin_time"
              :max-hour="api.end_time"
              :min-minute="0"
              :max-minute="59"
              :filter="filterdisabledTime"
              @cancel="handleTimeCancel"
              @confirm="handleTimeConfirm"
          />
        </van-tab>
        <van-tab name="end" title="结束时间" :disabled="booking.begin_time === null">
          <van-datetime-picker
              type="time"
              :min-hour="api.begin_time"
              :max-hour="api.end_time"
              :min-minute="0"
              :max-minute="59"
              :filter="filterdisabledTime"
              @confirm="handleTimeConfirm"
          />
        </van-tab>
      </van-tabs>
    </van-popup>
  </div>
</template>

<script>
/* eslint-disable */
/* @see https://vant-ui.github.io/vant/v2/#/zh-CN/calendar */
import {Button, Calendar, Cell, CellGroup, Checkbox, CheckboxGroup, DatetimePicker, Popup, Tab, Tabs, Tag} from 'vant'
import dayjs from 'dayjs'
import BookingGraph from '@/components/BookingGraph.vue'
import mock from '@/data'
import {bookingStatus, status, tags} from '@/config'

export default {
  name: 'mobile',
  computed: {
    status() {
      return status
    },
  },
  components: {
    [Calendar.name]: Calendar,
    [Popup.name]: Popup,
    [DatetimePicker.name]: DatetimePicker,
    [Tabs.name]: Tabs,
    [Tab.name]: Tab,
    [CellGroup.name]: CellGroup,
    [Cell.name]: Cell,
    [CheckboxGroup.name]: CheckboxGroup,
    [Checkbox.name]: Checkbox,
    [Button.name]: Button,
    [Tag.name]: Tag,
    BookingGraph,
  },

  data() {
    return {
      picker: {
        date: false,
        time: false,
        days: false,
        step: 'begin',
        tagIds: [],
      },
      // 都是 api 给的
      api: {
        bookingStatus,
        tags,
        disabled_dates: [],
        begin_time: 8,
        end_time: 22,
        gap_minute: 5,
        days: [
          {id: 1, name: '星期一'},
          {id: 2, name: '星期二'},
          {id: 3, name: '星期三'},
          {id: 4, name: '星期四'},
          {id: 5, name: '星期五'},
          {id: 6, name: '星期六'},
          {id: 7, name: '星期天'},
        ],
      },

      booking: {
        type: 'period', //'single',
        scope: 'seat',
        date: null,
        begin_time: null,
        end_time: null,
        days: [],
        seat_id: null,
        seat_label: null,
      },
    }
  },

  mounted() {
    // 接口获取座位数据
    mock.custom.widht = 800
    mock.custom.height = 600
    mock.normal.width = 800
    mock.normal.height = 600
    this.$refs.graph.make(mock.normal)
  },

  methods: {
    handleSelectSeat(seat) {
      console.log(seat)
      if (seat.booking_state !== 'bookable' || seat.state != 'normal') {
        // not bookable, do something..
        return
      }

      this.$refs.graph.setSelectedId(seat.id)
      this.booking.seat_id = seat.id
      this.booking.seat_label = seat.title
    },

    handleFilterTag(tagId) {
      const idx = this.picker.tagIds.findIndex(t => t === tagId)
      idx === -1 ? this.picker.tagIds.push(tagId) : this.picker.tagIds.splice(idx, 1)

      this.$refs.graph.filterTags(this.picker.tagIds)
    },

    handleScaling(val) {
      this.$refs.graph.graph.zoom(val)
      this.$refs.graph.graph.centerContent()
    },

    handleConfirm() {
      console.log(this.booking)
    },

    handleSelectedDays() {
      this.booking.days.sort()
      this.picker.days = false
    },

    handleSelectDays(index) {
      this.$refs.checkboxes[index].toggle()
    },

    handlePopupClosed() {
      this.picker.step = 'begin'
    },

    filterdisabledTime(type, options) {
      if (type === 'hour' && this.picker.step === 'end') {
        let [hour, minute] = this.booking.begin_time.split(':')
        hour = parseInt(hour)
        return options.filter(option => parseInt(option) >= hour)
      }

      if (type === 'minute') {
        return options.filter((option) => option % this.api.gap_minute === 0)
      }
      return options
    },

    handleTimeCancel() {
      this.booking.begin_time = null
      this.booking.end_time = null
      this.picker.time = false
    },

    handleTimeConfirm(value) {
      if (this.picker.step === 'begin') {
        this.booking.begin_time = value
        this.$nextTick(_ => this.picker.step = 'end')

        return
      }

      this.booking.end_time = value
      this.picker.time = false
    },

    handleDateSelect(value) {
      this.booking.date = dayjs(value).format('YYYY-MM-DD')
      this.picker.date = false
    },
  },
}
</script>

<style scoped lang="scss">

/*
手机预约界面
*/
$primary-color: #3066E1;

.mobile-screen {
  //width: 375px;
  //margin: 0 auto;
  //height: 1000px;
  //border: 1px solid #eeeeee;
  background: #F4F4F7;

  .form {
    padding: 20px;
    display: flex;
    flex-flow: column nowrap;
    gap: 10px;
    background: #ffffff;

    .cell {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 20px;

      .label {
        width: 75px;
        color: #333;
        font-size: 16px;
      }

      .value {
        flex: 1;
      }

      .btn-select, .radio-select {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 20px;
      }

      .btn-select {
        .item {
          width: 100px;
          height: 44px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 1px solid #DCDCDC;
          border-radius: 4px;

          &.selected {
            background: $primary-color;
            border-color: $primary-color;
            color: #ffffff;
          }
        }
      }

      .radio-select {
        .item {
          width: 100px;
          height: 44px;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          gap: 10px;

          .circle {
            width: 12px;
            height: 12px;
            border: 1px solid #D0D0D0;
            border-radius: 12px;
            position: relative;
          }

          &.selected {
            .circle {
              border-color: $primary-color;

              &::before {
                content: ' ';
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 6px;
                height: 6px;
                border-radius: 6px;
                background: $primary-color;
              }
            }
          }
        }
      }

      .days-pick {
        padding-top: 4px;
        padding-bottom: 4px;
        min-height: 42px;
        height: auto !important;
      }

      .days {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-flow: row wrap;
        gap: 0px 4px;
        min-height: 42px;
        height: auto;
      }

      .date-pick {
        box-sizing: border-box;
        height: 42px;
        background: #F8F8FA;
        position: relative;
        padding-left: 10px;
        padding-right: 40px;
        display: flex;
        justify-content: flex-start;
        align-items: center;

        .placeholder {
          color: #CECECE;
        }

        &::before {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          content: ' ';
          width: 20px;
          height: 20px;
          background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAcdJREFUaEPtWe2NwyAMtTPJrRAyQNNJbpS2o9wkTQcIuRFuhJsgPrkKUqRCAAM6oVKpv8Jz3vPDDh8Ilf+wcv7QBPy3g82B6h1YlmXs+36SCknFJ02heZ6viHhBxLNEBJMnojsR3YZhuEqSkCRAa30HgFEqwCSgCZBYx5jmwFZDRabQVmAXjzsfAMD/bwD4FTjpxRPRg+O6itxaxKa4BISKQVwuWQVorWljMiHirRirgMDrunKXe84EW7d7EZCjtQXwihpimoXNhSoEHH3wnAKkH6eo1AYOfk8BAPBFRD+BSSo6DBG53X4G1YDWmleWp6KM5MEfSqlxD3fWQLUOpC6R5cl1I9+ziFsbzTiXsk4hDsbrkyN+R9tDCT6bABPIl1yllHWRKMVnE8DEuUsdCei6bjra4EvwWQX4sl/ieRNQIqsxMbM64Osivhrw4W3732wCpF3EZFuKzyagdaGYib8bm9UBIYckmEhAymlZElsL+Oik5OWTvyu0SSl1zk0mNt6+8IO2lPwCcw6zvUx8eRFL1jH+uXCMOpkz3caciGUikhLGORu8FxxsYcqbU7G+mx+vgFQCpfFNQOkM++I3B3wZKv28egf+AAxVQU9DvIqQAAAAAElFTkSuQmCC") no-repeat;
          background-size: cover;
        }
      }
    }
  }

  .maps {
    margin-top: 20px;
    padding: 20px 0 150px;
    background: #ffffff;

    .tools {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 20px 20px;
      border-bottom: 1px solid #EFEFEF;
    }

    .scale {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 20px;
    }

    .filter {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 20px;

      .item {
        display: flex;
        justify-content: center;
        align-items: center;

        .icon {
          width: 20px;
          height: 20px;
          background-repeat: no-repeat;
          background-size: 20px;

          &.quiet {
            background-image: url("@/assets/quiet.png");
          }

          &.comfort {
            background-image: url("@/assets/comfort.png");
          }

          &.sun {
            background-image: url("@/assets/sun.png");
          }
        }

        .tit {
          padding-left: 4px;
          font-size: 16px;
          color: #333333;
        }
      }
    }
  }

  .footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    box-sizing: border-box;
    background: #ffffff;
    padding: 20px;
    border-top: 1px solid #EFEFEF;
    z-index: 10;

    .status {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 12px;
      padding-bottom: 20px;

      .item {
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;
        gap: 6px;
        line-height: 1;

        .color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid #DCDCDC;

          &.border-none {
            border: none;
            width: 14px;
            height: 14px;
          }
        }

        .tit {
          display: flex;
          flex-flow: column nowrap;
          gap: 6px;
        }
      }
    }
  }
}

@import "vant/lib/style/base.css";
@import "vant/lib/overlay/index.css";
@import "vant/lib/info/index.css";
@import "vant/lib/icon/index.css";
@import "vant/lib/popup/index.css";
@import "vant/lib/loading/index.css";
@import "vant/lib/button/index.css";
@import "vant/lib/toast/index.css";
@import "vant/lib/calendar/index.css";
@import "vant/lib/picker/index.css";
@import "vant/lib/tabs/index.css";
@import "vant/lib/tab/index.css";
@import "vant/lib/checkbox-group/index.css";
@import "vant/lib/checkbox/index.css";
@import "vant/lib/cell-group/index.css";
@import "vant/lib/cell/index.css";
@import "vant/lib/checkbox/index.css";
@import "vant/lib/tag/index.css";
</style>
