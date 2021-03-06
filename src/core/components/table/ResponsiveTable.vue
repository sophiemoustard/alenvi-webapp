<template>
  <div class="relative-position table-spinner-container">
    <q-table v-if="!loading" :data="data" :columns="columns" :row-key="rowKey" :pagination="pagination"
      binary-state-sort :visible-columns="formattedVisibleColumns" flat :separator="data.length ? separator : 'none'"
      :hide-bottom="hideBottom" :color="'#ff0000'"
      :rows-per-page-options="rowsPerPageOptions" v-on="$listeners" class="table-responsive q-pa-sm">
      <template #header="props">
        <slot name="header" :props="props">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">{{ col.label }}</q-th>
          </q-tr>
        </slot>
      </template>
      <template #body="props">
        <slot name="body" :props="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
              :style="col.style" :data-cy="`col-${col.name}`">
              {{ col.value }}
            </q-td>
          </q-tr>
        </slot>
      </template>
      <template #no-data>
        <div class="full-width row text-copper-grey-800 justify-center">
          <span class="text-italic q-pb-sm" style="font-size: 0.8rem">{{ noDataLabel }}</span>
          <q-separator />
        </div>
      </template>
    </q-table>
    <div v-else class="loading-container" />
    <q-inner-loading :showing="loading">
      <q-spinner-facebook size="30px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script>
export default {
  name: 'ResponsiveTable',
  props: {
    data: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] },
    pagination: { type: Object, default: () => ({ page: 1, rowsPerPage: 15 }) },
    rowKey: { type: String, default: 'name' },
    rowsPerPageOptions: { type: Array, default: () => [15, 25, 35] },
    visibleColumns: { type: Array, default: () => [] },
    separator: { type: String, default: 'horizontal' },
    loading: { type: Boolean, default: false },
    hideBottom: { type: Boolean, default: true },
    noDataLabel: { type: String, default: '' },
  },
  computed: {
    formattedVisibleColumns () {
      return this.visibleColumns.length ? this.visibleColumns : this.columns.map(col => col.name);
    },
  },
};
</script>
