<template>
  <div :class="['row', 'margin-input', { last: last }]">
    <div class="col-12">
      <div v-if="displayCaption" class="row justify-between">
        <p :class="['input-caption', { required: requiredField }]">{{ caption }}</p>
        <q-icon v-if="error" name="error_outline" color="secondary" />
      </div>
      <q-field dense borderless :error="error" :error-message="errorMessage" class="col-12">
        <q-option-group :value="value" :options="options" :readonly="readOnly" :type="type" :inline="inline" dense
          :disable="disable" v-on="$listeners" />
      </q-field>
    </div>
  </div>
</template>

<script>
import { REQUIRED_LABEL } from '@data/constants';

export default {
  name: 'NiOptionGroup',
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    value: { type: [String, Array, Boolean], default: '' },
    last: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    requiredField: { type: Boolean, default: false },
    options: { type: Array, default: () => [] },
    type: { type: String, default: '' },
    inline: { type: Boolean, default: false },
    displayCaption: { type: Boolean, default: true },
    disable: { type: Boolean, default: false },
  },
};
</script>

<style lang="stylus" scoped>
  .required::after
    content: ' *'
  /deep/.q-option-group
    color: $copper-grey-700 !important
    .q-radio
      padding: 10px 0 !important
      .q-radio__label
        font-size: 15px

  /deep/ .q-field__control
    min-height: 25px !important
</style>
