<template>
  <div>
    <div class="q-mt-lg q-mb-xl">
      <p class="text-weight-bold">Émargements</p>
      <attendance-table :course="course" />
      <ni-simple-table :data="attendanceSheets" :columns="columns" :loading="tableLoading"
        :visible-columns="visibleColumns" :pagination.sync="pagination">
        <template #body="{ props }">
          <q-tr :props="props">
            <q-td :props="props" v-for="col in props.cols" :key="col.name" :data-label="col.label" :class="col.name"
              :style="col.style">
              <template v-if="col.name === 'actions'">
                <div class="row no-wrap table-actions justify-end">
                  <ni-button icon="file_download" color="primary" type="a" :href="props.row.file.link"
                    :disable="!props.row.file.link" />
                  <ni-button v-if="canUpdate" icon="delete" color="primary"
                    @click="validateAttendanceSheetDeletion(props.row)" :disable="!props.row.file.link" />
                </div>
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </q-tr>
        </template>
      </ni-simple-table>
      <div class="flex justify-end">
        <ni-button v-if="canUpdate" class="bg-primary" color="white" icon="add"
          label="Ajouter une feuille d'émargement" @click="attendanceSheetAdditionModal = true" />
      </div>
    </div>
    <div v-if="questionnaires.length" class="q-mb-xl">
      <p class="text-weight-bold">Réponses aux questionnaires</p>
      <div class="questionnaires-container">
        <questionnaire-answers-cell v-for="questionnaire in questionnaires" :key="questionnaire._id"
          :questionnaire="questionnaire" @click="goToQuestionnaireAnswers(questionnaire._id)" />
      </div>
    </div>
    <trainee-follow-up-table :learners="learners" :loading="loading" class="q-mb-xl" is-blended />

    <attendance-sheet-addition-modal v-model="attendanceSheetAdditionModal" @hide="resetAttendanceSheetAdditionModal"
      @submit="addAttendanceSheet" :new-attendance-sheet.sync="newAttendanceSheet" :validations="$v.newAttendanceSheet"
      :loading="modalLoading" :course="course" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import pick from 'lodash/pick';
import get from 'lodash/get';
import { required, requiredIf } from 'vuelidate/lib/validators';
import AttendanceSheets from '@api/AttendanceSheets';
import Courses from '@api/Courses';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import AttendanceSheetAdditionModal from '@components/courses/AttendanceSheetAdditionModal';
import SimpleTable from '@components/table/SimpleTable';
import AttendanceTable from '@components/table/AttendanceTable';
import Button from '@components/Button';
import TraineeFollowUpTable from '@components/courses/TraineeFollowUpTable';
import QuestionnaireAnswersCell from '@components/courses/QuestionnaireAnswersCell';
import { SURVEY, OPEN_QUESTION, QUESTION_ANSWER, INTRA, INTER_B2B } from '@data/constants';
import { upperCaseFirstLetter, formatQuantity, formatIdentity } from '@helpers/utils';
import { formatDate } from '@helpers/date';
import { defineAbilitiesFor } from '@helpers/ability';
import { traineeFollowUpTableMixin } from '@mixins/traineeFollowUpTableMixin';

export default {
  name: 'ProfileTraineeFollowUp',
  mixins: [traineeFollowUpTableMixin],
  components: {
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'attendance-sheet-addition-modal': AttendanceSheetAdditionModal,
    'trainee-follow-up-table': TraineeFollowUpTable,
    'attendance-table': AttendanceTable,
    'questionnaire-answers-cell': QuestionnaireAnswersCell,
  },
  props: {
    profileId: { type: String, required: true },
  },
  data () {
    return {
      tableLoading: false,
      modalLoading: false,
      attendanceSheetAdditionModal: false,
      attendanceSheets: [],
      newAttendanceSheet: { course: this.profileId },
      SURVEY,
      OPEN_QUESTION,
      QUESTION_ANSWER,
      columns: [
        { name: 'date', label: 'Date', align: 'left', field: 'date', format: formatDate },
        {
          name: 'trainee',
          label: 'Nom de l\'apprenant',
          align: 'left',
          field: row => (this.course.trainees.find(trainee => trainee._id === row.trainee._id)),
          format: value => formatIdentity(get(value, 'identity'), 'FL'),
        },
        { name: 'actions', label: '', align: 'left', field: row => row },
      ],
      pagination: {
        page: 1,
        rowsPerPage: 15,
      },
      upperCaseFirstLetter,
      formatQuantity,
      questionnaires: [],
    };
  },
  validations () {
    return {
      newAttendanceSheet: {
        file: { required },
        trainee: { required: requiredIf(() => this.course.type !== INTRA) },
        date: { required: requiredIf(() => this.course.type === INTRA) },
      },
    };
  },
  async created () {
    await this.getLearnersList();
    await this.refreshAttendanceSheets();
    await this.refreshQuestionnaires();
  },
  computed: {
    ...mapState({ course: state => state.course.course, loggedUser: state => state.main.loggedUser }),
    visibleColumns () {
      return this.course.type === INTRA ? ['date', 'actions'] : ['trainee', 'actions'];
    },
    canUpdate () {
      const ability = defineAbilitiesFor(pick(this.loggedUser, ['role', 'company', '_id', 'sector']));

      return ability.can('update', 'course_trainee_follow_up');
    },
  },
  methods: {
    async refreshAttendanceSheets () {
      try {
        this.tableLoading = true;
        const attendanceSheets = await AttendanceSheets.list({ course: this.profileId });

        if (this.course.type === INTER_B2B && this.isClientInterface) {
          this.attendanceSheets = attendanceSheets
            .filter(a => get(a, 'trainee.company') === this.loggedUser.company._id);
        } else this.attendanceSheets = attendanceSheets;
      } catch (e) {
        console.error(e);
        this.attendanceSheets = [];
        NotifyNegative('Erreur lors de la récupération des feuilles d\'émargement.');
      } finally {
        this.tableLoading = false;
      }
    },
    resetAttendanceSheetAdditionModal () {
      this.$v.newAttendanceSheet.$reset();
      this.newAttendanceSheet = { course: this.profileId };
    },
    formatPayload () {
      const { course, file, trainee, date } = this.newAttendanceSheet;
      const form = new FormData();
      this.course.type === INTRA ? form.append('date', date) : form.append('trainee', trainee);
      form.append('course', course);
      form.append('file', file);

      return form;
    },
    async addAttendanceSheet () {
      try {
        if (!this.canUpdate) return NotifyNegative('Impossible d\'ajouter une feuille d\'émargement.');

        this.$v.newAttendanceSheet.$touch();
        if (this.$v.newAttendanceSheet.$error) return NotifyWarning('Champ(s) invalide(s)');
        this.modalLoading = true;

        await AttendanceSheets.create(this.formatPayload());

        this.attendanceSheetAdditionModal = false;
        NotifyPositive('Feuille d\'émargement ajoutée.');
        await this.refreshAttendanceSheets();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'ajout de la feuille d\'émargement.');
      } finally {
        this.modalLoading = false;
      }
    },
    validateAttendanceSheetDeletion (attendanceSheet) {
      if (!this.canUpdate) return NotifyNegative('Impossible de supprimer la feuille d\'émargement.');

      this.$q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cette feuille d\'émargement ?',
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => this.deleteAttendanceSheet(attendanceSheet._id))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    },
    async deleteAttendanceSheet (attendanceSheetId) {
      try {
        this.$q.loading.show();
        await AttendanceSheets.delete(attendanceSheetId);

        NotifyPositive('Feuille d\'émargement supprimée.');
        await this.refreshAttendanceSheets();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppresion de la feuille d\'émargement.');
      } finally {
        this.$q.loading.hide();
      }
    },
    async refreshQuestionnaires () {
      try {
        this.questionnaires = await Courses.getCourseQuestionnaires(this.course._id);
      } catch (e) {
        console.error(e);
        this.questionnaires = [];
        NotifyNegative('Erreur lors de la récupération des questionnaires.');
      }
    },
    goToQuestionnaireAnswers (questionnaireId) {
      return this.$router.push(
        { name: 'ni management questionnaire answers', params: { courseId: this.course._id, questionnaireId } }
      );
    },
  },
};
</script>
<style lang="stylus" scoped>
  .questionnaires-container
    display: grid
    grid-auto-flow: row
    grid-auto-rows: 1fr
    grid-template-columns: repeat(auto-fill, 224px)
    grid-gap: 16px
</style>
