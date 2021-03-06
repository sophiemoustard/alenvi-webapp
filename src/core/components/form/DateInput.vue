<template>
  <div :class="contentClass">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-input borderless dense :value="inputDate" bg-color="white" @input="input" placeholder="jj/mm/yyyy" :error="error"
      :disable="disable" :class="{ 'borders': inModal }" :error-message="errorMessage" @blur="blur" ref="dateInput"
      @focus="focus">
      <template #append>
        <q-icon name="event" class="cursor-pointer" @click="focus" color="copper-grey-500">
          <q-menu ref="qDateMenu" anchor="bottom right" self="top right">
            <q-date minimal :value="date" @input="select" :options="dateOptions" :disable="disable" />
          </q-menu>
        </q-icon>
      </template>
    </q-input>
  </div>
</template>

<script>
import { REQUIRED_LABEL } from '@data/constants';
import { formatDate } from '@helpers/date';
import moment from '@helpers/moment';

export default {
  name: 'NiDateInput',
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    value: { type: String, default: '' },
    min: { type: String, default: '' },
    max: { type: String, default: '' },
    disable: { type: Boolean, default: false },
    inModal: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    contentClass: { type: String, default: '' },
  },
  computed: {
    date () {
      if (!this.value) return '';
      return moment(this.value).format('YYYY/MM/DD');
    },
    inputDate () {
      if (!this.value) return '';
      return formatDate(this.value);
    },
  },
  methods: {
    dateOptions (date) {
      let isBeforeMax = true;
      let isAfterMin = true;
      if (this.min) isAfterMin = date >= moment(this.min).format('YYYY/MM/DD');
      if (this.max) isBeforeMax = date <= moment(this.max).format('YYYY/MM/DD');
      return isAfterMin && isBeforeMax;
    },
    select (value) {
      const momentValue = moment(value, 'YYYY/MM/DD', true);
      if (!momentValue.isValid()) return;
      this.update(momentValue.toISOString());
      this.$refs.qDateMenu.hide();
      this.$refs.dateInput.blur();
    },
    input (value) {
      const momentValue = moment(value, 'DD/MM/YYYY', true);
      if (!momentValue.isValid()) return;
      this.update(momentValue.toISOString());
    },
    update (value) {
      this.$emit('input', value);
    },
    blur () {
      this.$emit('blur');
    },
    focus () {
      this.$emit('focus');
    },
  },
};
</script>

<style lang="stylus" scoped>
  .q-input
    /deep/ .q-field__control
      font-size: 16px
      padding-left: 14px
      padding-right: 14px
      border-radius: 3px

  /deep/ .q-field__native, .q-field__prefix, .q-field__suffix, .q-field__input
    color: $copper-grey-900
</style>
