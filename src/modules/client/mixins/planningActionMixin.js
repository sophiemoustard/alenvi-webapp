import { mapState } from 'vuex';
import omit from 'lodash/omit';
import get from 'lodash/get';
import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import { required, requiredIf } from 'vuelidate/lib/validators';
import { subject } from '@casl/ability';
import InternalHours from '@api/InternalHours';
import Gdrive from '@api/GoogleDrive';
import Events from '@api/Events';
import { NotifyWarning, NotifyNegative, NotifyPositive } from '@components/popup/notify';
import {
  INTERNAL_HOUR,
  ABSENCE,
  INTERVENTION,
  NEVER,
  UNAVAILABILITY,
  ILLNESS,
  DAILY,
  SECTOR,
  CUSTOMER,
  OTHER,
  WORK_ACCIDENT,
} from '@data/constants';
import { frAddress, maxDate } from '@helpers/vuelidateCustomVal';
import { defineAbilitiesFor } from '@helpers/ability';
import moment from '@helpers/moment';
import { validationMixin } from '@mixins/validationMixin';

export const planningActionMixin = {
  mixins: [validationMixin],
  computed: {
    ...mapState('main', ['loggedUser']),
  },
  validations () {
    return {
      newEvent: {
        type: { required },
        dates: {
          startDate: {
            required,
            maxDate: this.getCustomerStoppedDate(this.newEvent)
              ? maxDate(this.getCustomerStoppedDate(this.newEvent))
              : '',
          },
          endDate: {
            required: requiredIf(() => this.newEvent &&
              (this.newEvent.type !== ABSENCE || this.newEvent.absenceNature === DAILY)),
          },
        },
        auxiliary: {
          required: requiredIf(item => item && (item.type !== INTERVENTION || this.personKey === CUSTOMER)),
        },
        customer: { required: requiredIf(item => item && item.type === INTERVENTION) },
        subscription: { required: requiredIf(item => item && item.type === INTERVENTION) },
        internalHour: { required: requiredIf(item => item && item.type === INTERNAL_HOUR) },
        absence: { required: requiredIf(item => item && item.type === ABSENCE) },
        absenceNature: { required: requiredIf(item => item && item.type === ABSENCE) },
        extension: {
          required: requiredIf(() => this.newEvent && this.newEvent.type === ABSENCE &&
            this.newEvent.isExtendedAbsence),
        },
        address: {
          zipCode: { required: requiredIf(item => item && !!item.fullAddress) },
          street: { required: requiredIf(item => item && !!item.fullAddress) },
          city: { required: requiredIf(item => item && !!item.fullAddress) },
          fullAddress: this.newEvent && this.newEvent.type === INTERNAL_HOUR ? { frAddress } : {},
        },
        repetition: {
          frequency: { required: requiredIf(() => this.newEvent && this.newEvent.type !== ABSENCE) },
        },
        attachment: {
          driveId: {
            required: requiredIf(() => this.newEvent && this.newEvent.type === ABSENCE &&
              [ILLNESS, WORK_ACCIDENT].includes(this.newEvent.absence)),
          },
          link: {
            required: requiredIf(() => this.newEvent && this.newEvent.type === ABSENCE &&
            [ILLNESS, WORK_ACCIDENT].includes(this.newEvent.absence)),
          },
        },
        misc: { required: requiredIf(item => item && item.type === ABSENCE && item.absence === OTHER) },
      },
      editedEvent: {
        dates: {
          startDate: {
            required,
            maxDate: this.getCustomerStoppedDate(this.editedEvent)
              ? maxDate(this.getCustomerStoppedDate(this.editedEvent))
              : '',
          },
          endDate: { required },
        },
        auxiliary: { required: requiredIf(item => item && item.type !== INTERVENTION) },
        sector: { required: requiredIf(item => item && !item.auxiliary) },
        customer: { required: requiredIf(item => item && item.type === INTERVENTION) },
        subscription: { required: requiredIf(item => item && item.type === INTERVENTION) },
        internalHour: { required: requiredIf(item => item && item.type === INTERNAL_HOUR) },
        absence: { required: requiredIf(item => item && item.type === ABSENCE) },
        absenceNature: { required: requiredIf(item => item && item.type === ABSENCE) },
        address: {
          zipCode: { required: requiredIf(item => item && !!item.fullAddress) },
          street: { required: requiredIf(item => item && !!item.fullAddress) },
          city: { required: requiredIf(item => item && !!item.fullAddress) },
          fullAddress: this.editedEvent && this.editedEvent.type === INTERNAL_HOUR ? { frAddress } : {},
        },
        attachment: {
          driveId: {
            required: requiredIf(() => this.editedEvent && this.editedEvent.type === ABSENCE &&
              [ILLNESS, WORK_ACCIDENT].includes(this.editedEvent.absence)),
          },
          link: {
            required: requiredIf(() => this.editedEvent && this.editedEvent.type === ABSENCE &&
              [ILLNESS, WORK_ACCIDENT].includes(this.editedEvent.absence)),
          },
        },
        cancel: {
          condition: {
            required: requiredIf(() => this.editedEvent && this.editedEvent.type === INTERVENTION &&
              this.editedEvent.isCancelled),
          },
          reason: {
            required: requiredIf(() => this.editedEvent && this.editedEvent.type === INTERVENTION &&
              this.editedEvent.isCancelled),
          },
        },
        misc: {
          required: requiredIf(item => item && ((item.type === ABSENCE && item.absence === OTHER) || item.isCancelled)),
        },
      },
    };
  },
  methods: {
    addSavedTerms (endPath) {
      if (this.$q.localStorage.has(`lastSearch${endPath}`) &&
        this.$q.localStorage.getItem(`lastSearch${endPath}`).length > 0) {
        const lastSearch = JSON.parse(this.$q.localStorage.getItem(`lastSearch${endPath}`));
        if (this.$refs.planningManager) this.$refs.planningManager.restoreFilter(lastSearch);
      }
    },
    async setInternalHours () {
      try {
        this.internalHours = await InternalHours.list();
      } catch (e) {
        console.error(e);
        this.internalHours = [];
      }
    },
    hasContractOnEvent (auxiliary, startDate, endDate = startDate) {
      if (!auxiliary.contracts || auxiliary.contracts.length === 0) return false;

      return auxiliary.contracts.some(contract => moment(contract.startDate).isSameOrBefore(endDate) &&
          (!contract.endDate || moment(contract.endDate).isAfter(startDate)));
    },
    getRowEvents (rowId) {
      return this.events[rowId] || [];
    },
    // Event creation
    canCreateEvent (person, selectedDay) {
      return this.hasContractOnEvent(person, selectedDay);
    },
    resetCreationForm ({ partialReset, type = INTERVENTION }) {
      this.$v.newEvent.$reset();
      if (!partialReset) {
        this.creationModal = false;
        this.newEvent = {};
      } else {
        this.newEvent = {
          ...this.newEvent,
          type,
          repetition: { frequency: NEVER },
          customer: '',
          subscription: '',
          internalHour: '',
          absence: '',
          absenceNature: '',
          extension: '',
          address: {},
          attachment: {},
          ...(type === ABSENCE && { absenceNature: DAILY }),
        };
      }
    },
    closeCreationModal () {
      this.creationModal = false;
    },
    getPayload (event) {
      const payload = {
        ...pickBy(omit(event, ['dates', '__v', 'company', 'isExtendedAbsence'])),
        ...pick(event, ['isCancelled']), // pickBy removes isCancelled: false
        startDate: event.dates.startDate,
        endDate: event.dates.endDate,
      };

      if (event.auxiliary) delete payload.sector;

      if (event.type === ABSENCE && event.absence !== ILLNESS && event.absence !== WORK_ACCIDENT) {
        payload.attachment = {};
      }

      return payload;
    },
    getCreationPayload (event) {
      const payload = this.getPayload(event);

      if (event.address && !event.address.fullAddress) delete payload.address;
      if (event.type === ABSENCE && event.absence !== ILLNESS && event.absence !== WORK_ACCIDENT) {
        payload.attachment = {};
      }

      return payload;
    },
    isCreationAllowed (event) {
      if (event.type === INTERVENTION && event.repetition && event.repetition.frequency !== NEVER) return true;

      return !this.hasConflicts(event, event.type);
    },
    isEditionAllowed (event, eventType) {
      if (event.shouldUpdateRepetition && eventType === INTERVENTION) return true;

      return !this.hasConflicts(event, eventType);
    },
    hasConflicts (scheduledEvent, eventType) {
      if (!scheduledEvent.auxiliary || scheduledEvent.isCancelled) return false;

      const { startDate, endDate, auxiliary } = scheduledEvent;
      const auxiliaryEvents = eventType !== ABSENCE
        ? this.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate)
        : this.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, ABSENCE);

      return auxiliaryEvents.some((ev) => {
        if ((scheduledEvent._id && scheduledEvent._id === ev._id) || ev.isCancelled) return false;
        return moment(scheduledEvent.startDate).isBetween(ev.startDate, ev.endDate, 'minutes', '[]') ||
          moment(ev.startDate).isBetween(scheduledEvent.startDate, scheduledEvent.endDate, 'minutes', '[]');
      });
    },
    getAuxiliaryEventsBetweenDates (auxiliaryId, startDate, endDate, type) {
      return this.getRowEvents(auxiliaryId)
        .filter(event => (moment(event.startDate).isBetween(startDate, endDate, 'minutes', '[)') ||
            moment(startDate).isBetween(event.startDate, event.endDate, 'minutes', '[)')) &&
            (!type || type === event.type));
    },
    async createEvent () {
      try {
        this.loading = true;
        const payload = this.getCreationPayload(this.newEvent);
        if (!this.isCreationAllowed(payload)) {
          return NotifyNegative('Impossible de créer l\'évènement : '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }

        await Events.create(payload);

        await this.refresh();
        this.creationModal = false;
        NotifyPositive('Évènement créé');
      } catch (e) {
        console.error(e);
        if (e.status === 409) {
          return NotifyNegative('Impossible de créer l\'évènement : '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }
        NotifyNegative('Erreur lors de la création de l\'évènement.');
      } finally {
        this.loading = false;
      }
    },
    getMessageForInternalOrUnavailability (type) {
      return `Les ${type} de la répétition en conflit avec les évènements existants ne seront pas créées. `
        + '<br /><br />Es-tu sûr(e) de vouloir créer cette répétition ?';
    },
    getConfirmationMessage () {
      switch (this.newEvent.type) {
        case INTERVENTION:
          return 'Les interventions de la répétition en conflit avec les évènements existants seront passées en '
          + 'à affecter. <br /><br />Es-tu sûr(e) de vouloir créer cette répétition ?';
        case INTERNAL_HOUR:
          return this.getMessageForInternalOrUnavailability('heures internes');
        case UNAVAILABILITY:
          return this.getMessageForInternalOrUnavailability('indisponibilités');
        default:
          return 'Es-tu sûr(e) de vouloir créer cette répétition ?';
      }
    },
    async validateCreationEvent () {
      try {
        this.$v.newEvent.$touch();
        const isValid = await this.waitForFormValidation(this.$v.newEvent);
        if (!isValid) return NotifyWarning('Champ(s) invalide(s)');

        if (this.newEvent.type === ABSENCE) {
          this.$q.dialog({
            title: 'Confirmation',
            message: 'Les interventions en conflit avec l\'absence seront passées en à affecter et les heures internes '
            + 'et indispo seront supprimées. <br /><br />Es-tu sûr(e) de vouloir créer cette absence ?',
            html: true,
            ok: 'OK',
            cancel: 'Annuler',
          })
            .onOk(this.createEvent)
            .onCancel(() => NotifyPositive('Création annulée.'));
        } else if (this.newEvent.auxiliary && get(this.newEvent, 'repetition.frequency', '') !== NEVER) {
          this.$q.dialog({
            title: 'Confirmation',
            message: this.getConfirmationMessage(),
            html: true,
            ok: 'OK',
            cancel: 'Annuler',
          })
            .onOk(this.createEvent)
            .onCancel(() => NotifyPositive('Création annulée.'));
        } else {
          await this.createEvent();
        }
      } catch (e) {
        console.error(e);
        if (e.status === 409) {
          return NotifyNegative('Impossible de créer l\'évènement : '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }
        NotifyNegative('Erreur lors de la création de l\'évènement.');
      }
    },
    // Event edition
    openEditionModal (event) {
      const isAllowed = this.canEditEvent({ auxiliaryId: get(event, 'auxiliary._id'), sectorId: event.sector });
      if (!isAllowed) return NotifyWarning('Vous n\'avez pas les droits pour réaliser cette action.');

      this.formatEditedEvent(event);

      this.editionModal = true;
    },
    formatEditedEvent (event) {
      const { startDate, endDate, isBilled, auxiliary, subscription, address, customer, internalHour, sector } = event;
      const eventData = omit(event, ['createdAt', 'updatedAt']);
      const dates = { startDate, endDate };

      switch (event.type) {
        case INTERVENTION: {
          this.editedEvent = {
            isCancelled: false,
            cancel: {},
            shouldUpdateRepetition: false,
            ...eventData,
            dates,
            sector: sector || auxiliary.sector._id,
            auxiliary: auxiliary ? auxiliary._id : '',
            customer: customer ? customer._id : '',
            subscription: subscription._id,
            isBilled,
            address,
          };
          break;
        }
        case INTERNAL_HOUR:
          this.editedEvent = {
            address: address || {},
            shouldUpdateRepetition: false,
            ...eventData,
            auxiliary: auxiliary._id,
            internalHour: internalHour._id,
            dates,
          };
          break;
        case ABSENCE:
          this.editedEvent = { address: {}, attachment: {}, ...eventData, auxiliary: auxiliary._id, dates };
          break;
        case UNAVAILABILITY:
          this.editedEvent = { shouldUpdateRepetition: false, ...eventData, auxiliary: auxiliary._id, dates };
          break;
      }
    },
    canEditEvent (event) {
      const ability = defineAbilitiesFor(pick(this.loggedUser, ['role', 'company', '_id', 'sector']));

      return ability.can('update', subject('Events', event));
    },
    resetEditionForm () {
      this.$v.editedEvent.$reset();
      this.editedEvent = {};
    },
    closeEditionModal () {
      this.editionModal = false;
    },
    getEditionPayload (event) {
      const payload = this.getPayload(event);

      if (event.cancel && Object.keys(event.cancel).length === 0) delete payload.cancel;
      if (event.attachment && Object.keys(event.attachment).length === 0) delete payload.attachment;
      if (event.shouldUpdateRepetition) delete payload.misc;
      if (event.auxiliary) delete payload.sector;
      if (event.address && !event.address.fullAddress) payload.address = {};

      return omit(
        payload,
        [
          'customer',
          'repetition',
          'staffingBeginning',
          'staffingDuration',
          'type',
          'displayedStartDate',
          'displayedEndDate',
          'extension',
          'histories',
          'startDateTimeStampedCount',
          'endDateTimeStampedCount',
        ]
      );
    },
    async updateEvent () {
      try {
        await this.$v.editedEvent.$touch();
        const isValid = await this.waitForFormValidation(this.$v.editedEvent);
        if (!isValid) return NotifyWarning('Champ(s) invalide(s)');

        this.loading = true;
        const payload = this.getEditionPayload(this.editedEvent);

        if (!this.isEditionAllowed(payload, this.editedEvent.type)) {
          this.$v.editedEvent.$reset();
          return NotifyNegative('Impossible de modifier l\'évènement : '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }
        delete payload._id;
        await Events.updateById(this.editedEvent._id, payload);

        await this.refresh();
        this.editionModal = false;
        NotifyPositive('Évènement modifié.');
      } catch (e) {
        console.error(e);
        if (e.status === 409) {
          this.$v.editedEvent.$reset();
          return NotifyNegative('Impossible de créer l\'évènement :  '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }
        NotifyNegative('Erreur lors de la modification de l\'évènement.');
      } finally {
        this.loading = false;
      }
    },
    getDragAndDropPayload (toDay, target, draggedObject) {
      const daysBetween = moment(draggedObject.endDate).diff(moment(draggedObject.startDate), 'days');
      const payload = {
        startDate: moment(toDay).hours(moment(draggedObject.startDate).hours())
          .minutes(moment(draggedObject.startDate).minutes()).toISOString(),
        endDate: moment(toDay).add(daysBetween, 'days').hours(moment(draggedObject.endDate).hours())
          .minutes(moment(draggedObject.endDate).minutes())
          .toISOString(),
      };

      if (target.type === SECTOR) payload.sector = target._id;
      else if (this.personKey === CUSTOMER) payload.auxiliary = draggedObject.auxiliary._id;
      else payload.auxiliary = target._id;

      if (draggedObject.isCancelled) {
        payload.isCancelled = draggedObject.isCancelled;
        payload.cancel = draggedObject.cancel;
        payload.misc = draggedObject.misc;
      }

      return payload;
    },
    async updateEventOnDrop (vEvent) {
      try {
        const { toDay, target, draggedObject } = vEvent;

        if (this.personKey === CUSTOMER && target._id !== draggedObject.customer._id) {
          return NotifyNegative('Impossible de modifier le bénéficiaire de l\'intervention.');
        }
        if (target.type === SECTOR && draggedObject.type !== INTERVENTION) {
          return NotifyNegative('Cette modification n\'est pas autorisée.');
        }
        if ([ABSENCE, UNAVAILABILITY].includes(draggedObject.type) && draggedObject.auxiliary._id !== target._id) {
          return NotifyNegative('Impossible de modifier l\'auxiliaire de cet évènement.');
        }

        const payload = this.getDragAndDropPayload(toDay, target, draggedObject);
        if (!this.isEditionAllowed(payload, draggedObject.type)) {
          return NotifyNegative('Impossible de modifier l\'évènement :  '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }

        await Events.updateById(draggedObject._id, payload);
        await this.refresh();

        NotifyPositive('Évènement modifié.');
      } catch (e) {
        if (e.status === 409) {
          return NotifyNegative('Impossible de créer l\'évènement :  '
            + 'il est en conflit avec les évènements de l\'auxiliaire.');
        }
        NotifyNegative('Erreur lors de la création de l\'évènement.');
      }
    },
    // Event files
    documentUploaded (uploadedInfo) {
      if (!uploadedInfo.xhr || !uploadedInfo.xhr.response) return;

      const json = JSON.parse(uploadedInfo.xhr.response);
      if (!json || !json.data || !json.data.payload) return;

      if (this.creationModal) this.newEvent.attachment = { ...json.data.payload.attachment };
      if (this.editionModal) this.editedEvent.attachment = { ...json.data.payload.attachment };
    },
    validateDocumentDeletion (driveId) {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Es-tu sûr(e) de vouloir supprimer ce document ?',
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => this.deleteDocument(driveId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    async deleteDocument (driveId) {
      try {
        await Gdrive.removeFileById({ id: driveId });
        if (this.creationModal) this.newEvent.attachment = {};
        if (this.editionModal) this.editedEvent.attachment = {};
        NotifyPositive('Document supprimé.');
      } catch (e) {
        return NotifyPositive('Suppression annulée.');
      }
    },
    // Event deletion
    validateEventDeletion () {
      this.$q.dialog({
        title: 'Confirmation',
        message: 'Es-tu sûr(e) de vouloir supprimer cet évènement ?',
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(this.deleteEvent)
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    async deleteEvent () {
      try {
        this.loading = true;
        await Events.deleteById(this.editedEvent._id);

        await this.refresh();
        this.editionModal = false;
        NotifyPositive('Évènement supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l\'événement.');
      } finally {
        this.loading = false;
      }
    },
    async deleteEventRepetition (shouldDeleteRepetition) {
      try {
        this.loading = true;
        if (shouldDeleteRepetition) {
          await Events.deleteRepetition(this.editedEvent._id);
          await this.refresh();
        } else {
          await Events.deleteById(this.editedEvent._id);
          await this.refresh();
        }
        this.editionModal = false;
        NotifyPositive('Évènement supprimé.');
      } catch (e) {
        console.error(e);
        if (shouldDeleteRepetition) NotifyNegative('Erreur lors de la suppression des évènements.');
        else NotifyNegative('Erreur lors de la suppression de l\'évènement.');
      } finally {
        this.loading = false;
      }
    },
    validationDeletionEventRepetition () {
      try {
        this.$q.dialog({
          title: 'Confirmation',
          message: 'Supprimer l\'événement périodique',
          ok: 'OK',
          cancel: 'Annuler',
          options: {
            type: 'radio',
            model: false,
            items: [
              { label: 'Supprimer uniquement cet évenement', value: false },
              { label: 'Supprimer cet évenement et tous les suivants', value: true },
            ],
          },
        }).onOk(this.deleteEventRepetition)
          .onCancel(() => NotifyPositive('Suppression annulée.'));
      } catch (e) {
        NotifyNegative('Erreur lors de la suppression de l\'événement.');
      } finally {
        this.loading = false;
      }
    },
    getCustomerStoppedDate (event) {
      const customer = this.customers ? this.customers.find(c => c._id === event.customer) : null;
      return get(customer, 'stoppedAt') || '';
    },
  },
};
