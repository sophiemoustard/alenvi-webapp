<template>
  <q-page class="client-background">
    <ni-planning-manager :events="events" :persons="displayedAuxiliaries" @update-start-of-week="updateStartOfWeek"
      @open-creation-modal="openCreationModal" @open-edition-modal="openEditionModal" @on-drop="updateEventOnDrop"
      :filtered-sectors="filteredSectors" :person-key="personKey" :filters="activeFilters" :can-edit="canEditEvent"
      @toggle-all-sectors="toggleAllSectors" :event-histories="eventHistories" ref="planningManager"
      :display-all-sectors="displayAllSectors" @toggle-history="toggleHistory" :display-history="displayHistory"
      @update-feeds="updateEventHistories" :working-stats="workingStats" @refresh="refresh" />

    <!-- Event creation modal -->
    <ni-event-creation-modal :validations="$v.newEvent" :loading="loading" :new-event.sync="newEvent"
      :creation-modal="creationModal" :internal-hours="internalHours" @close="closeCreationModal" :customers="customers"
      :person-key="personKey" :active-auxiliaries="activeAuxiliaries" @reset="resetCreationForm"
      @delete-document="validateDocumentDeletion" @document-uploaded="documentUploaded"
      @submit="validateCreationEvent" />

    <!-- Event edition modal -->
    <ni-event-edition-modal :validations="$v.editedEvent" :loading="loading" :edited-event.sync="editedEvent"
      :edition-modal="editionModal" :internal-hours="internalHours" :active-auxiliaries="activeAuxiliaries"
      :customers="customers" @hide="resetEditionForm" @delete-document="validateDocumentDeletion"
      @document-uploaded="documentUploaded" @close="closeEditionModal" @delete-event="validateEventDeletion"
      @delete-event-repetition="validationDeletionEventRepetition" :person-key="personKey" @submit="updateEvent" />
  </q-page>
</template>

<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import Customers from '@api/Customers';
import Events from '@api/Events';
import EventHistories from '@api/EventHistories';
import { NotifyNegative, NotifyWarning } from '@components/popup/notify';
import { INTERVENTION, NEVER, PERSON, AUXILIARY, SECTOR, COACH_ROLES, DAILY } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import moment from '@helpers/moment';
import EventCreationModal from 'src/modules/client/components/planning/EventCreationModal';
import EventEditionModal from 'src/modules/client/components/planning/EventEditionModal';
import Planning from 'src/modules/client/components/planning/Planning';
import { planningActionMixin } from 'src/modules/client/mixins/planningActionMixin';

export default {
  name: 'AuxiliaryPlanning',
  mixins: [planningActionMixin],
  metaInfo: { title: 'Planning auxiliaires' },
  components: {
    'ni-planning-manager': Planning,
    'ni-event-creation-modal': EventCreationModal,
    'ni-event-edition-modal': EventEditionModal,
  },
  props: {
    targetedAuxiliary: { type: Object, default: null },
  },
  data () {
    return {
      loading: false,
      days: [],
      events: {},
      customers: [],
      auxiliaries: [],
      internalHours: [],
      // Filters
      filteredSectors: [],
      filteredAuxiliaries: [],
      savedSearch: [],
      // Event creation
      newEvent: {},
      creationModal: false,
      // Event edition
      editedEvent: {},
      editionModal: false,
      startOfWeek: '',
      personKey: AUXILIARY,
      displayAllSectors: false,
      eventHistories: [],
      displayHistory: false,
      workingStats: {},
    };
  },
  async mounted () {
    try {
      await Promise.all([
        this.fillFilter({ company: this.company, roleToSearch: AUXILIARY }),
        this.getCustomers(),
      ]);
      this.initFilters();
      await this.setInternalHours();
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la récupération des personnes.');
    }
  },
  watch: {
    async elementToAdd (val) {
      await this.addElementToFilter(val);
    },
    async elementToRemove (val) {
      await this.removeElementFromFilter(val);
    },
  },
  computed: {
    ...mapState('planning', ['filters', 'elementToAdd', 'elementToRemove']),
    ...mapGetters({
      clientRole: 'main/getClientRole',
      company: 'main/getCompany',
    }),
    displayedAuxiliaries () {
      return this.auxiliaries
        .filter(aux => aux.sector && this.hasContractOnEvent(aux, moment(this.startOfWeek), this.endOfWeek));
    },
    endOfWeek () {
      return moment(this.startOfWeek).endOf('w').toISOString();
    },
    activeAuxiliaries () {
      return this.filters
        .filter(f => f.type === PERSON)
        .filter(aux => this.hasContractOnEvent(aux, moment(this.startOfWeek), this.endOfWeek));
    },
    activeFilters () {
      return this.filters
        .filter(f => f.type === SECTOR ||
          this.hasContractOnEvent(f, moment(this.startOfWeek), this.endOfWeek) ||
          // add targeted auxiliary even if not active on strat of week to display future events
          (this.targetedAuxiliary && f._id === this.targetedAuxiliary._id));
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

      const range = moment.range(this.startOfWeek, moment(this.startOfWeek).add(6, 'd'));
      this.days = Array.from(range.by('days'));
      if ((this.auxiliaries && this.auxiliaries.length) ||
        (this.filteredSectors && this.filteredSectors.length)) await this.refresh();
    },
    // Filters
    initFilters () {
      if (this.targetedAuxiliary) {
        this.$refs.planningManager.restoreFilter([formatIdentity(this.targetedAuxiliary.identity, 'FL')]);
      } else if (COACH_ROLES.includes(this.clientRole)) {
        this.addSavedTerms('Auxiliaries');
      } else {
        const userSector = this.filters.find(filter => filter.type === SECTOR && filter._id === this.loggedUser.sector);
        if (userSector && this.$refs.planningManager) this.$refs.planningManager.restoreFilter([userSector.label]);
      }
    },
    // History
    async toggleHistory (displayHistory) {
      this.displayHistory = displayHistory;
      if (displayHistory) await this.getEventHistories();
      else this.eventHistories = [];
    },
    // Refresh data
    async toggleAllSectors (search) {
      this.displayAllSectors = !this.displayAllSectors;
      if (!this.displayAllSectors) {
        this.auxiliaries = [];
        this.filteredSectors = [];
        this.events = {};
        this.$refs.planningManager.restoreFilter(this.savedSearch);
      } else {
        this.savedSearch = search;
        this.filteredAuxiliaries = [];
        this.auxiliaries = this.filters.filter(fil => fil.type === PERSON)
          .map(aux => this.formatAuxiliaryWithSector(aux));
        this.filteredSectors = this.filters.filter(fil => fil.type === SECTOR);
        await this.refresh();
      }
    },
    updateAuxiliariesList () {
      const auxiliaries = [];
      for (const sector of this.filteredSectors) {
        auxiliaries.push(...this.getAuxBySector(sector).reduce(
          (acc, aux) => (!acc.some(a => a._id === aux._id) ? [...acc, this.formatAuxiliaryWithSector(aux)] : acc),
          []
        ));
      }

      auxiliaries.push(...this.filteredAuxiliaries.reduce(
        (acc, aux) => (!acc.some(a => a._id === aux._id) ? [...acc, this.formatAuxiliaryWithSector(aux)] : acc),
        []
      ));

      this.auxiliaries = auxiliaries;
    },
    async refresh () {
      const params = { startDate: this.startOfWeek, endDate: this.endOfWeek, groupBy: AUXILIARY };

      if (!this.displayAllSectors) {
        this.updateAuxiliariesList();
        params.auxiliary = this.auxiliaries.map(aux => aux._id);
        params.sector = this.filteredSectors.map(sector => sector._id);
      }

      await Promise.all([
        this.refreshEvents(params),
        this.refreshWorkingStats(pick(params, ['startDate', 'endDate', 'auxiliary'])),
      ]);
    },
    async refreshEvents (params) {
      try {
        this.events = await Events.list(params);
        if (this.displayHistory) await this.getEventHistories();
      } catch (e) {
        console.error(e);
        this.events = {};
      }
    },
    async refreshWorkingStats (params) {
      try {
        this.workingStats = await Events.workingStats(params);
      } catch (e) {
        console.error(e);
        this.workingStats = {};
      }
    },
    async getCustomers () {
      try {
        this.customers = await Customers.listWithSubscriptions();
      } catch (e) {
        console.error(e);
        this.customers = [];
      }
    },
    async getEventHistories (lastCreatedAt = null) {
      const eventHistoriesTmp = cloneDeep(this.eventHistories);
      try {
        const params = {
          sectors: this.filteredSectors.map(sector => sector._id),
          auxiliaries: this.auxiliaries.map(aux => aux._id),
        };

        let oldEventHistories;
        if (lastCreatedAt) {
          oldEventHistories = await EventHistories.list({ ...params, createdAt: lastCreatedAt });
          this.eventHistories.push(...oldEventHistories);
        } else {
          oldEventHistories = await EventHistories.list(params);
          this.eventHistories = oldEventHistories;
        }

        return oldEventHistories;
      } catch (e) {
        console.error(e);
        this.eventHistories = eventHistoriesTmp;
        NotifyNegative('Erreur lors de la récupération du flux d\'activité');
      }
    },
    // Event creation
    openCreationModal (vEvent) {
      const { dayIndex, person, sectorId } = vEvent;
      const selectedDay = this.days[dayIndex];

      if (person && !this.canCreateEvent(person, selectedDay)) {
        return NotifyWarning('Impossible de créer un évènement à cette date à cette auxiliaire.');
      }

      this.newEvent = {
        type: INTERVENTION,
        repetition: { frequency: NEVER },
        customer: '',
        subscription: '',
        internalHour: '',
        absence: '',
        absenceNature: DAILY,
        address: { fullAddress: '' },
        attachment: {},
        auxiliary: person ? person._id : '',
        sector: person ? person.sector._id : sectorId,
        dates: {
          startDate: moment(selectedDay).hours(8).toISOString(),
          endDate: moment(selectedDay).hours(10).toISOString(),
        },
        extension: '',
        isExtendedAbsence: false,
      };
      this.creationModal = true;
    },
    formatAuxiliaryWithSector (aux) {
      const sectorHistory = this.getSectorHistory(aux);
      return { ...aux, sector: sectorHistory ? sectorHistory.sector : null };
    },
    getSectorHistory (aux, sector) {
      if (!aux.sectorHistories) return null;
      const sectorHistory = aux.sectorHistories.find((sh) => {
        const isSameSector = sector ? sh.sector._id === sector._id : true;
        const isStartDateBeforeEndOfWeek = moment(sh.startDate).isSameOrBefore(this.endOfWeek);
        const isEndDateAfterStartOfWeek = !sh.endDate ||
          moment(sh.endDate).isSameOrAfter(this.startOfWeek);
        return isSameSector && isStartDateBeforeEndOfWeek && isEndDateAfterStartOfWeek;
      });
      return sectorHistory;
    },
    getAuxBySector (sector) {
      return this.filters.filter(aux => !!this.getSectorHistory(aux, sector));
    },
    // Filter
    async addElementToFilter (el) {
      this.$refs.planningManager.updatePlanningHeaderHeight();

      if (el.type === SECTOR) {
        this.filteredSectors.push(el);
      } else if (!this.filteredAuxiliaries.some(aux => aux._id === el._id)) this.filteredAuxiliaries.push(el);

      await this.refresh();
    },
    async removeElementFromFilter (el) {
      this.$refs.planningManager.updatePlanningHeaderHeight();

      if (el.type === SECTOR) {
        this.filteredSectors = this.filteredSectors.filter(sec => sec._id !== el._id);
        this.updateAuxiliariesList();
      } else { // el = auxiliary
        const auxiliary = this.auxiliaries.find(aux => aux._id === el._id);
        this.filteredAuxiliaries = this.filteredAuxiliaries.filter(aux => aux._id !== auxiliary._id);
        this.updateAuxiliariesList();
        if (this.auxiliaries.some(aux => aux._id === auxiliary._id)) return;
      }

      await this.updateDisplayedEventHistories();
    },
    async updateDisplayedEventHistories () {
      this.eventHistories = this.eventHistories
        .filter(history => this.auxiliaries.some(aux => history.auxiliaries.map(a => a._id).includes(aux._id)));
      if (this.auxiliaries.length) await this.getEventHistories();
      if (this.eventHistories.length === 0) this.displayHistory = false;
    },
    async updateEventHistories (done) {
      const lastCreatedAt = this.eventHistories.length
        ? this.eventHistories[this.eventHistories.length - 1].createdAt
        : null;
      const oldEventHistories = await this.getEventHistories(lastCreatedAt);
      if (oldEventHistories.length) return done();
      done(true);
    },
  },
};
</script>
