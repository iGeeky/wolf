<template>
  <div class="dashboard-editor-container">
    <div class=" clearfix">
      <github-corner style="position: absolute; top: 0px; border: 0; right: 0;" />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import GithubCorner from '@/components/GithubCorner'

export default {
  name: 'DashboardEditor',
  components: { GithubCorner },
  data() {
    return {
      emptyGif: 'https://wpimg.wallstcn.com/0e03b7da-db9e-4819-ba10-9016ddfdaed3',
    }
  },
  computed: {
    ...mapGetters([
      'name',
      'avatar',
      'roles',
    ]),
  },
}
</script>

<style lang="scss" scoped>
  .emptyGif {
    display: block;
    width: 45%;
    margin: 0 auto;
  }

  .dashboard-editor-container {
    background-color: #ffffff;
    min-height: 100vh;
    padding: 50px 60px 0px;

  }
</style>
