<template>
  <div class="row q-mb-md">
    <div :class="[titleContainerClass, 'page-title']">{{ title }}</div>
    <div :class="searchBarContainerClass">
      <q-input class="no-border" :value="search" :placeholder="searchPlaceholder" dense borderless
        @input="input" debounce="0" type="search" bg-color="white">
        <template #prepend>
          <q-icon size="xs" name="search" />
        </template>
      </q-input>
    </div>
    <div v-if="displayToggle" class="col-xs-12 col-md-2 row justify-end">
      <q-toggle dense :value="toggleValue" color="primary" :label="toggleLabel" @input="toggle" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'DirectoryHeader',
  props: {
    title: { type: String, default: '' },
    searchPlaceholder: { type: String, default: 'Rechercher un profil' },
    toggleLabel: { type: String, default: '' },
    toggleValue: { type: Boolean, default: false },
    displayToggle: { type: Boolean, default: false },
    search: { type: String, default: '' },
  },
  computed: {
    titleContainerClass () {
      return ['col-xs-12', this.displayToggle ? 'col-md-5' : 'col-md-6', { 'q-mb-sm': this.$q.platform.is.mobile }];
    },
    searchBarContainerClass () {
      return ['col-xs-12', this.displayToggle ? 'col-md-5' : 'col-md-6'];
    },
  },
  methods: {
    input (value) {
      this.$emit('update-search', value);
    },
    toggle (value) {
      this.$emit('toggle', value);
    },
  },
};
</script>

<style lang="stylus" scoped>
  .q-option
    font-size: 14px;
  .q-input
    /deep/ .q-field__control
      font-size: 14px
</style>
