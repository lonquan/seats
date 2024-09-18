<template>
  <div class="navs">
    <router-link to="/config">配置</router-link>
    <router-link to="/web">PC 预订</router-link>
    <router-link to="/mobile">H5 预订</router-link>
  </div>
</template>

<script>
/* eslint-disable */
export default {
  name: 'index',
}
</script>

<style scoped lang="scss">
.navs {
  padding: 100px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
</style>
