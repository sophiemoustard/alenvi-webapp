<template>
  <ni-modal :value="value" @hide="hide" @input="input">
      <template slot="title">
        Editer le <span class="text-weight-bold">tiers payeur</span>
      </template>
      <ni-input in-modal caption="Nom" :value="editedThirdPartyPayer.name" @input="update($event, 'name')"
        :error="validations.name.$error" @blur="validations.name.$touch" required-field />
      <ni-search-address in-modal :value="editedThirdPartyPayer.address" error-message="Adresse invalide"
        @blur="validations.address.$touch" :error="validations.address.$error" @input="update($event, 'address')" />
      <ni-input in-modal caption="Email" :value="editedThirdPartyPayer.email" error-message="Email invalide"
        :error="!validations.email.email" @input="update($event.trim(), 'email')" />
      <ni-input in-modal caption="Prix unitaire TTC par défaut" suffix="€" type="number"
        :value="editedThirdPartyPayer.unitTTCRate" :error="validations.unitTTCRate.$error"
        :error-message="nbrError('unitTTCRate', validations)" @input="update($event, 'unitTTCRate')" />
      <ni-select in-modal :value="editedThirdPartyPayer.billingMode" :options="billingModeOptions"
        caption="Facturation" :filter="false" required-field :error="validations.billingMode.$error"
        @blur="validations.billingMode.$touch" @input="update($event, 'billingMode')" />
      <ni-input in-modal caption="ID de télétransmission" :value="editedThirdPartyPayer.teletransmissionId"
        @input="update($event, 'teletransmissionId')" />
      <div class="row q-mb-md light-checkbox">
        <q-checkbox :value="editedThirdPartyPayer.isApa" label="Financement APA" @input="update($event, 'isApa')"
          dense />
      </div>
      <template slot="footer">
        <q-btn no-caps class="full-width modal-btn" label="Editer le tiers payeur" icon-right="check" color="primary"
          :loading="loading" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';
import { configMixin } from 'src/modules/client/mixins/configMixin';
import SearchAddress from '@components/form/SearchAddress';
import Select from '@components/form/Select';

export default {
  name: 'ThirdPartyPayerEditionModal',
  mixins: [configMixin],
  props: {
    value: { type: Boolean, default: false },
    editedThirdPartyPayer: { type: Object, default: () => ({}) },
    billingModeOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
    'ni-select': Select,
    'ni-search-address': SearchAddress,
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
      this.$emit('update:editedThirdPartyPayer', { ...this.editedThirdPartyPayer, [prop]: event });
    },
  },
};
</script>
