<template>
  <ni-modal :value="value" @hide="hide" @input="input">
    <template slot="title">
        Modifier mon <span class="text-weight-bold">mot de passe</span>
      </template>
      <ni-input in-modal :value="newPassword.password" type="password" caption="Nouveau mot de passe"
        :error-message="passwordErrorMessage" required-field @blur="validations.newPassword.password.$touch"
        :error="validations.newPassword.password.$error" @input="update($event, 'password')" />
      <ni-input in-modal :value="newPassword.confirm" :error="validations.newPassword.confirm.$error"
        type="password" caption="Confirmation mot de passe" :error-message="confirmErrorMessage" required-field
        @blur="validations.newPassword.confirm.$touch" @input="update($event, 'confirm')" />
      <template slot="footer">
        <q-btn no-caps class="full-width modal-btn" label="Modifier" color="primary" :loading="loading"
          icon-right="done" @click="submit" />
      </template>
  </ni-modal>
</template>

<script>
import Modal from '@components/modal/Modal';
import Input from '@components/form/Input';

export default {
  name: 'NewPasswordModal',
  props: {
    validations: { type: Object, default: () => ({}) },
    userProfile: { type: Object, default: () => ({}) },
    passwordErrorMessage: { type: String, default: '' },
    newPassword: { type: Object, default: () => ({}) },
    confirmErrorMessage: { type: String, default: '' },
    value: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  components: {
    'ni-input': Input,
    'ni-modal': Modal,
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
      this.$emit('update:newPassword', { ...this.newPassword, [prop]: event.trim() });
    },
  },
};
</script>
