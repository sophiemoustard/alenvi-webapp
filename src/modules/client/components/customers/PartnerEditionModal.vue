<template>
  <ni-modal :value="value" @hide="hide" @input="input">
    <template slot="title">
      Editer un <span class="text-weight-bold">partenaire</span>
    </template>
    <ni-input in-modal :value="editedPartner.identity.firstname" @input="update($event.trim(), 'identity.firstname')"
      caption="Prénom" />
    <ni-input in-modal :value="editedPartner.identity.lastname" @input="update($event.trim(), 'identity.lastname')"
      @blur="validations.identity.lastname.$touch" :error="validations.identity.lastname.$error" caption="Nom"
      required-field />
    <ni-input in-modal :value="editedPartner.email" @input="update($event.trim(), 'email')" caption="Email"
      @blur="validations.email.$touch" :error="validations.email.$error" :error-message="emailError(validations)" />
    <ni-input in-modal :value="editedPartner.phone" @input="update($event.trim(), 'phone')" caption="Téléphone"
      @blur="validations.phone.$touch" :error="validations.phone.$error"
      :error-message="phoneNumberError(validations)" />
    <ni-select in-modal :value="editedPartner.job" @input="update($event, 'job')" caption="Fonction"
      :options="jobOptions" />
    <template slot="footer">
      <q-btn no-caps class="full-width modal-btn" label="Editer le partenaire" icon-right="add" color="primary"
        @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import set from 'lodash/set';
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import { JOB_OPTIONS } from '@data/constants';
import { partnerOrganizationMixin } from '@mixins/partnerOrganizationMixin';

export default {
  name: 'PartnerCreationModal',
  mixins: [partnerOrganizationMixin],
  props: {
    value: { type: Boolean, default: false },
    editedPartner: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-modal': Modal,
    'ni-input': Input,
    'ni-select': Select,
  },
  data () {
    return {
      jobOptions: JOB_OPTIONS,
    };
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
    update (event, path) {
      this.$emit('update:editedPartner', set({ ...this.editedPartner }, path, event));
    },
  },
};
</script>
