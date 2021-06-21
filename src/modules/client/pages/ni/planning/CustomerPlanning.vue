<template>
  <q-page class="client-background">
    <ni-planning-manager :events="events" :persons="customers" :person-key="personKey" :can-edit="canEditEvent"
      @update-start-of-week="updateStartOfWeek" @open-edition-modal="openEditionModal" ref="planningManager"
      @open-creation-modal="openCreationModal" @on-drop="updateEventOnDrop" :filters="filters"
      @refresh="refresh" />

    <!-- Event creation modal -->
    <ni-event-creation-modal :validations="$v.newEvent" :new-event.sync="newEvent" :person-key="personKey"
      :creation-modal="creationModal" :active-auxiliaries="activeAuxiliaries" :loading="loading" :customers="customers"
      @reset="resetCreationForm" @submit="validateCreationEvent" @close="closeCreationModal" />

    <!-- Event edition modal -->
    <ni-event-edition-modal :validations="$v.editedEvent" :loading="loading" :edited-event.sync="editedEvent"
      :edition-modal="editionModal" :active-auxiliaries="activeAuxiliaries" :customers="customers"
      @reset="resetEditionForm" @submit="updateEvent" @close="closeEditionModal" :person-key="personKey"
      @delete-event-repetition="validationDeletionEventRepetition" @delete-event="validateEventDeletion" />
  </q-page>
</template>

<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import get from 'lodash/get';
import Events from '@api/Events';
import Customers from '@api/Customers';
import Users from '@api/Users';
import { NotifyNegative, NotifyWarning } from '@components/popup/notify';
import {
  INTERVENTION,
  DEFAULT_AVATAR,
  NEVER,
  AUXILIARY,
  PLANNING_REFERENT,
  CUSTOMER,
  SECTOR,
  COACH_ROLES,
} from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import moment from '@helpers/moment';
import { isAfter } from '@helpers/date';
import { planningActionMixin } from 'src/modules/client/mixins/planningActionMixin';
import Planning from 'src/modules/client/components/planning/Planning';
import EventCreationModal from 'src/modules/client/components/planning/EventCreationModal';
import EventEditionModal from 'src/modules/client/components/planning/EventEditionModal';

export default {
  name: 'CustomerPlanning',
  metaInfo: { title: 'Planning bénéficiaire' },
  mixins: [planningActionMixin],
  components: {
    'ni-event-creation-modal': EventCreationModal,
    'ni-event-edition-modal': EventEditionModal,
    'ni-planning-manager': Planning,
  },
  props: {
    targetedCustomer: { type: Object, default: null },
  },
  data () {
    return {
      loading: false,
      days: [],
      events: {},
      customers: [],
      auxiliaries: [],
      startOfWeek: '',
      filteredSectors: [],
      filteredCustomers: [],
      DEFAULT_AVATAR,
      // Event creation
      newEvent: {},
      creationModal: false,
      // Event edition
      editedEvent: {},
      editionModal: false,
      personKey: CUSTOMER,
      sectorCustomers: [],
    };
  },
  async mounted () {
    try {
      await this.fillFilter({ company: this.company, roleToSearch: CUSTOMER });
      await this.getAuxiliaries();
      this.initFilters();
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des personnes.');
    }
  },
  watch: {
    async elementToAdd (val) {
      await this.addElementToFilter(val);
    },
    elementToRemove (val) {
      this.removeElementFromFilter(val);
    },
  },
  computed: {
    ...mapState('planning', ['filters', 'elementToAdd', 'elementToRemove']),
    ...mapGetters({
      company: 'main/getCompany',
      clientRole: 'main/getClientRole',
    }),
    endOfWeek () {
      return moment(this.startOfWeek).endOf('w').toISOString();
    },
    activeAuxiliaries () {
      return this.auxiliaries
        .filter(aux => this.hasContractOnEvent(aux, moment(this.startOfWeek), this.endOfWeek));
    },
  },
  methods: {
    ...mapActions({
      fillFilter: 'planning/fillFilter',
    }),
    // Dates
    async updateStartOfWeek (vEvent) {
      const { startOfWeek } = vEvent;
      this.startOfWeek = startOfWeek;

      const range = moment.range(this.startOfWeek, moment(this.startOfWeek).endOf('w'));
      this.days = Array.from(range.by('days'));
      if (this.filteredSectors.length !== 0 || this.filteredCustomers.length !== 0) await this.refreshCustomers();
      if (this.customers.length !== 0) await this.refresh();
    },
    // Filters
    initFilters () {
      if (this.targetedCustomer) {
        this.$refs.planningManager.restoreFilter([formatIdentity(this.targetedCustomer.identity, 'FL')]);
      } else if (COACH_ROLES.includes(this.clientRole)) {
        this.addSavedTerms('Customers');
      } else {
        const userSector = this.filters.find(filter => filter.type === SECTOR && filter._id === this.loggedUser.sector);
        if (userSector && this.$refs.planningManager) this.$refs.planningManager.restoreFilter([userSector.label]);
      }
    },
    // Refresh
    async refreshCustomers () {
      this.customers = [];
      try {
        this.sectorCustomers = await this.getSectorCustomers(this.filteredSectors);
      } catch (e) {
        this.sectorCustomers = [];
      }

      for (let i = 0, l = this.sectorCustomers.length; i < l; i++) {
        if (!this.customers.some(cus => this.sectorCustomers[i]._id === cus._id)) {
          this.customers.push(this.sectorCustomers[i]);
        }
      }
      if (this.filteredCustomers.length !== 0) {
        for (let i = 0, l = this.filteredCustomers.length; i < l; i++) {
          if (!this.customers.some(cus => this.filteredCustomers[i]._id === cus._id)) {
            this.customers.push(this.filteredCustomers[i]);
          }
        }
      }
    },
    async refresh () {
      try {
        this.events = await Events.list({
          startDate: this.startOfWeek,
          endDate: this.endOfWeek,
          customer: this.customers.map(cus => cus._id),
          groupBy: CUSTOMER,
        });
      } catch (e) {
        this.events = {};
      }
    },
    async getAuxiliaries () {
      const params = { role: [AUXILIARY, PLANNING_REFERENT] };
      const companyId = get(this.company, '_id');
      if (companyId) params.company = companyId;
      this.auxiliaries = await Users.list(params);
    },
    // Event creation
    openCreationModal (vEvent) {
      const { dayIndex, person } = vEvent;
      const selectedDay = this.days[dayIndex];

      if (isAfter(selectedDay, person.stoppedAt)) {
        return NotifyWarning('Le bénéficiare est arrêté à cette date.');
      }

      this.newEvent = {
        type: INTERVENTION,
        repetition: { frequency: NEVER },
        customer: person._id,
        subscription: '',
        internalHour: '',
        absence: '',
        address: get(person, 'contact.primaryAddress', {}),
        attachment: {},
        auxiliary: '',
        sector: '',
        dates: {
          startDate: moment(selectedDay).hours(8).toISOString(),
          endDate: moment(selectedDay).hours(10).toISOString(),
        },
      };
      this.creationModal = true;
    },
    async getSectorCustomers (sectors) {
      return sectors.length === 0
        ? []
        : Customers.listBySector({
          startDate: this.startOfWeek,
          endDate: this.endOfWeek,
          sector: sectors,
        });
    },
    // Filter
    async addElementToFilter (el) {
      this.$refs.planningManager.updatePlanningHeaderHeight();

      if (el.type === SECTOR) {
        this.filteredSectors.push(el._id);
        this.sectorCustomers = await this.getSectorCustomers(this.filteredSectors);
        for (let i = 0, l = this.sectorCustomers.length; i < l; i++) {
          if (!this.customers.some(cus => this.sectorCustomers[i]._id === cus._id)) {
            this.customers.push(this.sectorCustomers[i]);
          }
        }
        await this.refresh();
      } else { // el = customer
        if (!this.filteredCustomers.some(cust => cust._id === el._id)) this.filteredCustomers.push(el);
        if (!this.customers.some(cust => cust._id === el._id)) {
          this.customers.push(el);
          await this.refresh();
        }
      }
    },
    async removeElementFromFilter (el) {
      this.$refs.planningManager.updatePlanningHeaderHeight();

      if (el.type === SECTOR) {
        this.filteredSectors = this.filteredSectors.filter(sec => sec !== el._id);
        await this.refreshCustomers();
        await this.refresh();
      } else {
        this.filteredCustomers = this.filteredCustomers.filter(cus => cus._id !== el._id);
        if (!this.sectorCustomers.some(cus => cus._id === el._id)) {
          this.customers = this.customers.filter(customer => customer._id !== el._id);
        }
      }
    },
  },
};
</script>
