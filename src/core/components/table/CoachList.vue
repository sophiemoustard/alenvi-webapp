<template>
  <div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Utilisateurs</p>
      <q-card>
        <ni-responsive-table :data="users" :columns="usersColumns" :pagination.sync="usersPagination"
          :loading="usersLoading">
          <template #header="{ props }">
            <q-tr :props="props">
              <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style"
                :class="[{ 'table-actions-responsive': col.name === 'actions' }]">
                {{ col.label }}
              </q-th>
            </q-tr>
          </template>
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                <ni-button v-if="col.name === 'actions'" icon="edit" @click="openCoachEditionModal(props.row)" />
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
        <q-card-actions align="right">
          <ni-button color="primary" icon="add" label="Ajouter un utilisateur" @click="coachCreationModal = true"
            :disable="usersLoading" />
        </q-card-actions>
      </q-card>
    </div>

    <coach-creation-modal v-model="coachCreationModal" :new-coach.sync="newCoach" :email-error="emailError($v.newCoach)"
      :first-step="firstStep" :loading="loading" :phone-nbr-error="phoneNbrError($v.newCoach)"
      :role-options="roleOptions" @hide="resetCoachCreationForm" @show="openCoachCreationModal" @submit="createCoach"
      @go-to-next-step="nextStep" :validations="$v.newCoach" />

    <coach-edition-modal v-model="coachEditionModal" :phone-nbr-error="phoneNbrError($v.selectedCoach)"
      :validations="$v.selectedCoach" :email-error="emailError($v.selectedCoach)" :selected-coach.sync="selectedCoach"
      :role-options="roleOptions" @hide="resetCoachEditionForm" @submit="updateCoach" :loading="loading" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { required, email } from 'vuelidate/lib/validators';
import get from 'lodash/get';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import cloneDeep from 'lodash/cloneDeep';
import Roles from '@api/Roles';
import Email from '@api/Email';
import Users from '@api/Users';
import Button from '@components/Button';
import ResponsiveTable from '@components/table/ResponsiveTable';
import CoachCreationModal from '@components/table/CoachCreationModal';
import CoachEditionModal from '@components/table/CoachEditionModal';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { userMixin } from '@mixins/userMixin';
import { formatPhone, clear, removeEmptyProps, formatPhoneForPayload } from '@helpers/utils';
import { defineAbilitiesFor } from '@helpers/ability';
import { ROLES_TRANSLATION, CLIENT_ADMIN, COACH } from '@data/constants';
import { frPhoneNumber } from '@helpers/vuelidateCustomVal';

export default {
  name: 'CoachList',
  components: {
    'ni-button': Button,
    'ni-responsive-table': ResponsiveTable,
    'coach-creation-modal': CoachCreationModal,
    'coach-edition-modal': CoachEditionModal,
  },
  props: {
    company: { type: Object, default: () => ({}) },
  },
  mixins: [userMixin],
  data () {
    return {
      loading: false,
      usersLoading: false,
      coachCreationModal: false,
      coachEditionModal: false,
      firstStep: true,
      usersColumns: [
        { name: 'firstname', label: 'Prénom', align: 'left', field: row => get(row, 'identity.firstname') || '' },
        { name: 'lastname', label: 'Nom', align: 'left', field: row => get(row, 'identity.lastname') || '' },
        { name: 'email', label: 'Email', align: 'left', field: row => get(row, 'local.email') || '' },
        {
          name: 'phone',
          label: 'Téléphone',
          align: 'left',
          field: row => get(row, 'contact.phone') || '',
          format: formatPhone,
        },
        {
          name: 'role',
          label: 'Role',
          align: 'left',
          field: row => get(row, 'role.client.name') || '',
          format: value => (value ? ROLES_TRANSLATION[value] : ''),
        },
        { name: 'actions', label: '', align: 'center' },
      ],
      usersPagination: {
        rowsPerPage: 0,
        sortBy: 'lastname',
      },
      newCoach: {
        identity: { firstname: '', lastname: '' },
        contact: { phone: '' },
        role: '',
        local: { email: '' },
        company: '',
      },
      userValidations: {
        identity: { lastname: { required } },
        local: { email: { required, email } },
        contact: { phone: { frPhoneNumber } },
        role: { required },
      },
      selectedCoach: {
        identity: {},
        local: {},
        contact: {},
      },
      roles: [],
      users: [],
    };
  },
  validations () {
    return {
      newCoach: this.userValidations,
      selectedCoach: this.userValidations,
    };
  },
  async created () {
    await this.getUsers();
  },
  computed: {
    ...mapState('main', ['loggedUser']),
    roleOptions () {
      return this.roles.map(role => ({ label: ROLES_TRANSLATION[role.name], value: role._id }));
    },
    canSetUserCompany () {
      const ability = defineAbilitiesFor(pick(this.loggedUser, ['role', 'company']));

      return ability.can('set', 'user_company');
    },
  },
  methods: {
    formatUserPayload (user) {
      const userPayload = removeEmptyProps(user);
      if (this.canSetUserCompany) userPayload.company = this.company._id;
      if (get(user, 'contact.phone')) userPayload.contact.phone = formatPhoneForPayload(user.contact.phone);
      return userPayload;
    },
    async nextStep () {
      try {
        this.loading = true;
        this.$v.newCoach.local.email.$touch();
        if (this.$v.newCoach.local.email.$error || !this.newCoach.local.email) return NotifyWarning('Champs invalides');
        const userInfo = await Users.exists({ email: this.newCoach.local.email });
        const { user } = userInfo;

        const sameOrNoCompany = !user.company || user.company === this.company._id;
        const noDataOnUser = !Object.keys(user).length;
        if (userInfo.exists && (!sameOrNoCompany || noDataOnUser)) {
          return NotifyNegative('Cet utilisateur n\'est pas relié à cette structure');
        }
        if (userInfo.exists && get(userInfo, 'user.role.client')) return NotifyNegative('Utilisateur déjà existant');
        if (userInfo.exists) {
          const payload = { role: this.newCoach.role };
          if (!user.company) payload.company = this.company._id;

          await Users.updateById(userInfo.user._id, payload);

          NotifyPositive('Coach créé');
          await this.getUsers();
          this.coachCreationModal = false;
        } else this.firstStep = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du coach');
      } finally {
        this.loading = false;
      }
    },
    async createCoach () {
      try {
        this.loading = true;
        this.$v.newCoach.$touch();
        if (this.$v.newCoach.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Users.create(this.formatUserPayload(this.newCoach));

        NotifyPositive('Utilisateur enregistré.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de l\'utilisateur.');
      } finally {
        this.loading = false;
      }

      if (!get(this.company, 'subscriptions.erp')) {
        try {
          const userRole = this.roles.find(role => role._id === this.newCoach.role);
          if (!get(userRole, 'name')) return NotifyNegative('Problème lors de l\'envoi du mail');

          await Email.sendWelcome({ email: this.newCoach.local.email, type: get(userRole, 'name') });
          NotifyPositive('Email envoyé.');
        } catch (e) {
          console.error(e);
          NotifyNegative('Erreur lors de l\'envoi du mail.');
          this.loading = false;
          this.coachCreationModal = false;
        }
      }

      this.loading = false;
      this.coachCreationModal = false;
      this.getUsers();
    },
    resetCoachCreationForm () {
      this.firstStep = true;
      this.newCoach = { ...clear(this.newCoach) };
      this.$v.newCoach.$reset();
    },
    async getRoles () {
      try {
        this.roles = await Roles.list({ name: [CLIENT_ADMIN, COACH] });
      } catch (e) {
        console.error(e);
        this.roles = [];
      }
    },
    async openCoachCreationModal () {
      if (!this.roles.length) await this.getRoles();
      const coachRole = this.roles.find(role => role.name === COACH);
      if (coachRole) this.newCoach.role = coachRole._id;
    },
    async openCoachEditionModal (user) {
      if (!this.roles.length) await this.getRoles();

      this.selectedCoach = {
        ...this.selectedCoach,
        role: user.role.client._id,
        ...pick(cloneDeep(user), ['_id', 'identity.firstname', 'identity.lastname', 'local.email', 'contact.phone']),
      };
      this.coachEditionModal = true;
    },
    resetCoachEditionForm () {
      this.$v.selectedCoach.$reset();
      this.selectedCoach = { identity: {}, local: {}, contact: {} };
    },
    formatUpdatedUserPayload (user) {
      const userPayload = pickBy(
        pick(user, ['identity.firstname', 'identity.lastname', 'local.email', 'role', 'contact.phone'])
      );
      if (get(user, 'contact.phone')) userPayload.contact.phone = formatPhoneForPayload(user.contact.phone);
      return userPayload;
    },
    async updateCoach () {
      try {
        this.loading = true;
        this.$v.selectedCoach.$touch();
        if (this.$v.selectedCoach.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Users.updateById(this.selectedCoach._id, this.formatUpdatedUserPayload(this.selectedCoach));
        this.coachEditionModal = false;
        this.getUsers();
        NotifyPositive('Utilisateur modifié.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification de l\'utilisateur.');
      } finally {
        this.loading = false;
      }
    },
    async getUsers () {
      try {
        this.usersLoading = true;
        this.users = await Users.list({ role: [CLIENT_ADMIN, COACH], company: this.company._id });
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des utilisateurs');
        this.users = [];
      } finally {
        this.usersLoading = false;
      }
    },
  },
};
</script>
