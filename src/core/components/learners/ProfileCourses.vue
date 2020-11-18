<template>
  <div class="q-mb-xl">
    <p class="text-weight-bold q-mb-none">Formations suivies</p>
    <ni-table-list :data="orderedCourses" :columns="columns" @go-to="goToBlendedCourseProfileAdmin"
      :pagination.sync="pagination" :disabled="!isVendorInterface">
      <template v-slot:body="{ col }">
        <q-item v-if="col.name === 'progress'">
          <ni-progress :value="col.value" />
        </q-item>
      </template>
    </ni-table-list>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import get from 'lodash/get';
import Courses from '@api/Courses';
import TableList from '@components/table/TableList';
import { FORTHCOMING, IN_PROGRESS, COMPLETED, BLENDED } from '@data/constants';
import { userMixin } from '@mixins/userMixin';
import { sortStrings } from '@helpers/utils';
import { courseFiltersMixin } from '@mixins/courseFiltersMixin';
import { courseTimelineMixin } from '@mixins/courseTimeline';
import Progress from '@components/CourseProgress';

export default {
  name: 'ProfileCourses',
  components: {
    'ni-table-list': TableList,
    'ni-progress': Progress,
  },
  mixins: [userMixin, courseTimelineMixin, courseFiltersMixin],
  data () {
    return {
      isVendorInterface: /\/ad\//.test(this.$router.currentRoute.path),
      courses: [],
      statusTranslation: {
        [FORTHCOMING]: 0,
        [IN_PROGRESS]: 0.5,
        [COMPLETED]: 1,
      },
      pagination: {
        sortBy: 'name',
        descending: false,
        page: 1,
        rowsPerPage: 15,
      },
      columns: [
        {
          name: 'name',
          label: 'Nom',
          field: row => row,
          align: 'left',
          sortable: true,
          format: value => (get(value, 'subProgram.program.name') || '') + (value.misc ? ` - ${value.misc}` : ''),
          sort: (a, b) => sortStrings(get(a, 'subProgram.program.name') || '', get(b, 'subProgram.program.name') || ''),
          style: 'min-width: 200px; width: 65%',
        },
        {
          name: 'type',
          label: 'Type',
          field: 'format',
          align: 'left',
          sortable: true,
          format: value => ((value === BLENDED) ? 'Formation mixte' : 'Formation eLearning'),
          sort: (a, b) => sortStrings(a, b),
          style: 'min-width: 110px; width: 35%',
        },
        {
          name: 'progress',
          label: 'Progression',
          field: 'status',
          align: 'center',
          sortable: true,
          format: value => this.statusTranslation[value],
          style: 'min-width: 110px; width: 35%',
        },
      ],
    };
  },
  computed: {
    ...mapState('userProfile', ['userProfile']),
    orderedCourses () {
      return [...this.courseListForthcoming, ...this.courseListInProgress, ...this.courseListCompleted];
    },
  },
  async created () {
    const courses = await Courses.list({ trainees: this.userProfile._id });
    this.courses = this.groupByCourses(courses);
  },
  methods: {
    goToBlendedCourseProfileAdmin (row) {
      if (!this.isVendorInterface) return;
      this.$router.push({
        name: 'ni management blended courses info',
        params: { courseId: row._id, defaultTab: 'admin' },
      });
    },
  },
};
</script>