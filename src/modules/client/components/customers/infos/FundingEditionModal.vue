<template>
  <ni-modal :value="value" @hide="hide">
      <template slot="title">
        Éditer le <span class="text-weight-bold">financement</span>
      </template>
      <ni-date-input v-model="editedFunding.startDate" caption="Date de début de prise en charge"
        :max="editedFundingMaxStartDate" class="last" in-modal @blur="validations.startDate.$touch"
        :error="validations.startDate.$error" required-field />
      <ni-date-input v-model="editedFunding.endDate" caption="Date de fin de prise en charge" in-modal
        :min="$moment(editedFunding.startDate).add(1, 'day').toISOString()" />
      <ni-input in-modal v-model="editedFunding.folderNumber" caption="Numéro de dossier" />
      <ni-input in-modal v-if="!isFixedFunding" v-model="editedFunding.unitTTCRate"
        caption="Prix unitaire TTC" type="number" @blur="validations.unitTTCRate.$touch"
        :error="validations.unitTTCRate.$error" required-field />
      <ni-input in-modal v-if="isFixedFunding" v-model="editedFunding.amountTTC"
        caption="Montant forfaitaire TTC" type="number" @blur="validations.amountTTC.$touch"
        :error="validations.amountTTC.$error" required-field />
      <ni-input in-modal v-if="!isFixedFunding" v-model="editedFunding.careHours"
        caption="Nb. heures prises en charge" type="number" @blur="validations.careHours.$touch"
        :error="validations.careHours.$error" required-field suffix="h" />
      <ni-input in-modal v-if="!isFixedFunding" v-model="editedFunding.customerParticipationRate"
        caption="Taux de participation du bénéficiaire" type="number" suffix="%"
        @blur="validations.customerParticipationRate.$touch"
        :error="validations.customerParticipationRate.$error" required-field />
      <ni-option-group v-model="editedFunding.careDays" :options="daysOptions" caption="Jours pris en charge"
        type="checkbox" inline @blur="validations.careDays.$touch" :error="validations.careDays.$error"
        required-field />
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

export default {
  name: 'FundingEditionModal',
  props: {
    value: { type: Boolean, default: false },
    editedFunding: { type: Object, default: () => ({}) },
    daysOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'ni-date-input': DateInput,
    'ni-option-group': OptionGroup,
  },
  data () {
    return {
    };
  },
  computed: {
    editedFundingMaxStartDate () {
      return this.editedFunding && this.editedFunding.endDate
        ? this.$moment(this.editedFunding.endDate).subtract(1, 'day').toISOString()
        : '';
    },
    isFixedFunding () {
      return this.editedFunding.nature === FIXED;
    },
  },
  methods: {
    hide () {
      this.$emit('hide');
    },
    submit () {
      this.$emit('submit');
    },
  },
};
</script>