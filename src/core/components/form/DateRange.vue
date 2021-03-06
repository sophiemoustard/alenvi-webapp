<template>
  <div class="col-12">
    <div v-if="caption" class="row justify-between">
      <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
      <q-icon v-if="error" name="error_outline" color="secondary" />
    </div>
    <q-field dense borderless :error="hasError" :error-message="innerErrorMessage">
      <div :class="['date-container', 'justify-center', 'items-center', 'row', borders && 'date-container-borders']">
        <ni-date-input data-cy="date-input" :value="value.startDate" @input="update($event, 'startDate')"
          class="date-item" @blur="blur" />
        <p class="delimiter">-</p>
        <ni-date-input data-cy="date-input" :value="value.endDate" @input="update($event, 'endDate')" class="date-item"
          :min="value.startDate" @blur="blur" />
      </div>
    </q-field>
  </div>
</template>

<script>
import { required } from 'vuelidate/lib/validators';
import { minDate } from '@helpers/vuelidateCustomVal';
import DateInput from '@components/form/DateInput';
import { REQUIRED_LABEL } from '@data/constants';
import moment from '@helpers/moment';

export default {
  components: {
    'ni-date-input': DateInput,
  },
  props: {
    caption: { type: String, default: '' },
    value: {
      type: Object,
      default () {
        return {
          startDate: moment().startOf('d').toISOString(),
          endDate: moment().endOf('d').toISOString(),
        };
      },
    },
    requiredField: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    borders: { type: Boolean, default: false },
  },
  validations () {
    return {
      value: {
        startDate: { required },
        endDate: { required, minDate: minDate(this.value.startDate) },
      },
    };
  },
  computed: {
    hasError () {
      return this.error || this.$v.value.$error;
    },
    innerErrorMessage () {
      if (!this.$v.value.startDate.required || !this.$v.value.startDate.required) return REQUIRED_LABEL;
      if (!this.$v.value.endDate.minDate) return 'La date de fin doit être postérieure à la date de début';

      return this.errorMessage;
    },
  },
  methods: {
    update (value, key) {
      this.$v.value.$touch();
      this.$emit('input', { ...this.value, [key]: value });
    },
    blur () {
      this.$emit('blur');
    },
  },
};
</script>

<style lang="stylus" scoped>
  .date-container-borders
    border: solid 1px $copper-grey-300
    border-radius: 3px

  /deep/ .q-field__append
    .text-negative
      display: none

  /deep/ .q-field__bottom
    color: $secondary
    padding-top: 3px

  .date-container
    width: 100%
    border-radius: 3px
    background-color: white
    & .delimiter
      margin: 0
      color: $copper-grey-700

  .date-item
    max-width: 150px
    /deep/ .q-field--with-bottom
      padding-bottom: 0px
    /deep/ .q-field__bottom
      display: none
</style>
