<template>
  <ni-select :in-modal="inModal" :value="value" @input="updateSector" :options="sectors" :error-message="errorMessage"
    @blur="blurHandler" @focus="focusHandler" filter-placeholder="Rechercher" :error="error" ref="selectSector"
    :caption="caption" :required-field="requiredField" />
</template>

<script>
import sortBy from 'lodash/sortBy';
import Sectors from '@api/Sectors';
import Select from '@components/form/Select';
import { REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'SelectSector',
  props: {
    value: { type: String, default: '' },
    myError: { type: String, default: null },
    inModal: { type: Boolean, default: false },
    companyId: { type: String, default: '' },
    allowNullOption: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    caption: { type: String, default: 'Équipe' },
    requiredField: { type: Boolean, default: false },
  },
  components: {
    'ni-select': Select,
  },
  data () {
    return {
      sectors: [],
    };
  },
  async mounted () {
    await this.getSectors();
  },
  methods: {
    async getSectors () {
      try {
        const sectors = await Sectors.list();
        if (this.allowNullOption) sectors.push({ name: 'Toutes les équipes', _id: '' });
        this.sectors = sortBy(sectors.map(sector => ({ label: sector.name, value: sector._id })), ['label']);
      } catch (e) {
        console.error(e);
      }
    },
    updateSector (value) {
      this.$emit('input', value);
    },
    blurHandler () {
      this.$emit('blur');
    },
    focusHandler () {
      this.$emit('focus');
    },
  },
};
</script>
