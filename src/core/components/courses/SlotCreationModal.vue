<template>
  <ni-modal :value="value" @hide="hide" @input="input" container-class="modal-container-md">
    <template slot="title">
        Ajouter un <span class="text-weight-bold">créneau</span>
      </template>
      <ni-select in-modal caption="Etape" :options="stepOptions" :value="newCourseSlot.step" required-field
        @blur="validations.step.$touch" :error="validations.step.$error" @input="update($event, 'step')" />
      <ni-datetime-range caption="Dates et heures" :value="newCourseSlot.dates" required-field disable-end-date
        :error="validations.dates.$error" @blur="validations.dates.$touch" @input="update($event, 'dates')" />
      <ni-search-address :value="newCourseSlot.address" @input="update($event, 'address')" :error-message="addressError"
        @blur="validations.address.$touch" :error="validations.address.$error" in-modal last />
      <template slot="footer">
        <q-btn no-caps class="full-width modal-btn" label="Ajouter un créneau" icon-right="add" color="primary"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import DateTimeRange from '@components/form/DatetimeRange';
import SearchAddress from '@components/form/SearchAddress';
import { REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'SlotCreationModal',
  props: {
    value: { type: Boolean, default: false },
    newCourseSlot: { type: Object, default: () => ({}) },
    stepOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-datetime-range': DateTimeRange,
    'ni-search-address': SearchAddress,
    'ni-modal': Modal,
    'ni-select': Select,
  },
  computed: {
    addressError () {
      if (!this.validations.address.fullAddress.required) return REQUIRED_LABEL;
      return 'Adresse non valide';
    },
  },
  methods: {
    hide () {
      this.$emit('hide');
    },
    input (event) {
      this.$emit('input', event);
    },
    submit () {
      this.$emit('submit');
    },
    update (event, prop) {
      this.$emit('update:newCourseSlot', { ...this.newCourseSlot, [prop]: event });
    },
  },
};
</script>
