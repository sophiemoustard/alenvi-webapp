<template>
  <ni-modal :value="value" @hide="hide" @input="input">
    <template slot="title">
      Historique du financement <span class="text-weight-bold">{{ selected.thirdPartyPayer.name }}</span>
    </template>
    <ni-funding-grid-table :data="selected.versions" :columns="fundingsColumns"
      :visible-columns="visibleColumns" />
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import FundingGridTable from 'src/modules/client/components/table/FundingGridTable';
import { fundingMixin } from 'src/modules/client/mixins/fundingMixin';
import { FIXED } from '@data/constants';

export default {
  name: 'FundingDetailsModal',
  props: {
    value: { type: Boolean, default: false },
    selected: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-funding-grid-table': FundingGridTable,
  },
  mixins: [
    fundingMixin,
  ],
  computed: {
    visibleColumns () {
      return this.selectedFunding.nature === FIXED
        ? ['startDate', 'endDate', 'amountTTC', 'customerParticipationRate', 'careDays']
        : ['startDate', 'endDate', 'unitTTCRate', 'careHours', 'customerParticipationRate', 'careDays'];
    },
  },
  methods: {
    hide () {
      this.$emit('hide');
    },
    input (event) {
      this.$emit('input', event);
    },
  },
};
</script>
