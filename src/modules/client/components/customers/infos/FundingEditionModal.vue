<template>
  <ni-modal :value="value" @hide="hide" @input="input">
      <template slot="title">
        Éditer le <span class="text-weight-bold">financement</span>
      </template>
      <ni-input in-modal v-if="needFundingPlanIdForEditedFunding" :value="editedFunding.fundingPlanId"
        caption="ID du plan de financement" @input="update($event, 'fundingPlanId')" required-field
        :error="validations.fundingPlanId.$error" @blur="validations.fundingPlanId.$touch" />
      <ni-date-input :value="editedFunding.startDate" caption="Date de début de prise en charge"
        :max="editedFundingMaxStartDate" class="last" in-modal @blur="validations.startDate.$touch"
        :error="validations.startDate.$error" required-field @input="update($event, 'startDate')" />
      <ni-date-input :value="editedFunding.endDate" caption="Date de fin de prise en charge" in-modal
        :min="minEndDate" @input="update($event, 'endDate')" @blur="validations.endDate.$touch"
        :error="validations.endDate.$error" error-message="La date de fin doit etre postérieure à la date de début" />
      <ni-input in-modal :value="editedFunding.folderNumber" caption="Numéro de dossier"
        @input="update($event, 'folderNumber')" />
      <ni-input in-modal v-if="!isFixedFunding" :value="editedFunding.unitTTCRate" caption="Prix unitaire TTC"
        type="number" @blur="validations.unitTTCRate.$touch" :error="validations.unitTTCRate.$error" required-field
        :error-message="unitTtcRateErrorMessage" @input="update($event, 'unitTTCRate')" />
      <ni-input in-modal v-if="isFixedFunding" :value="editedFunding.amountTTC" caption="Montant forfaitaire TTC"
        type="number" @blur="validations.amountTTC.$touch" :error="validations.amountTTC.$error" required-field
        :error-message="amountTtcErrorMessage" @input="update($event, 'amountTTC')" />
      <ni-input in-modal v-if="!isFixedFunding" :value="editedFunding.careHours" caption="Nb. heures prises en charge"
        :error-message="careHoursErrorMessage" type="number" @blur="validations.careHours.$touch"
        :error="validations.careHours.$error" required-field suffix="h" @input="update($event, 'careHours')" />
      <ni-input in-modal v-if="!isFixedFunding" :value="editedFunding.customerParticipationRate" type="number"
        caption="Taux de participation du bénéficiaire" :error-message="customerParticipationRateErrorMessage"
        @blur="validations.customerParticipationRate.$touch" @input="update($event, 'customerParticipationRate')"
        :error="validations.customerParticipationRate.$error" required-field suffix="%" />
      <ni-option-group :value="editedFunding.careDays" :options="daysOptions" caption="Jours pris en charge"
        type="checkbox" inline @blur="validations.careDays.$touch" :error="validations.careDays.$error"
        required-field @input="update($event, 'careDays')" />
      <template slot="footer">
        <q-btn no-caps class="full-width modal-btn" label="Éditer le financement" icon-right="check" color="primary"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import DateInput from '@components/form/DateInput';
import OptionGroup from '@components/form/OptionGroup';
import { FIXED } from '@data/constants';
import moment from '@helpers/moment';

export default {
  name: 'FundingEditionModal',
  props: {
    value: { type: Boolean, default: false },
    editedFunding: { type: Object, default: () => ({}) },
    daysOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    careHoursErrorMessage: { type: String, default: '' },
    amountTtcErrorMessage: { type: String, default: '' },
    unitTtcRateErrorMessage: { type: String, default: '' },
    customerParticipationRateErrorMessage: { type: String, default: '' },
    needFundingPlanIdForEditedFunding: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'ni-date-input': DateInput,
    'ni-option-group': OptionGroup,
  },
  computed: {
    editedFundingMaxStartDate () {
      return this.editedFunding && this.editedFunding.endDate
        ? moment(this.editedFunding.endDate).subtract(1, 'day').toISOString()
        : '';
    },
    isFixedFunding () {
      return this.editedFunding.nature === FIXED;
    },
    minEndDate () {
      return moment(this.editedFunding.startDate).add(1, 'day').toISOString();
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
      this.$emit('update:editedFunding', { ...this.editedFunding, [prop]: event });
    },
  },
};
</script>
