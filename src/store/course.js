import get from 'lodash/get';
import Courses from '@api/Courses';
import router from 'src/router/index';
import store from 'src/store/index';

export default {
  namespaced: true,
  state: {
    course: null,
    selectedTrainer: '',
    selectedProgram: '',
    selectedCompany: '',
  },
  mutations: {
    SET_COURSE: (state, data) => { state.course = !data ? data : ({ ...data }); },
    SET_SELECTED_TRAINER: (state, data) => { state.selectedTrainer = data; },
    SET_SELECTED_PROGRAM: (state, data) => { state.selectedProgram = data; },
    SET_SELECTED_COMPANY: (state, data) => { state.selectedCompany = data; },
  },
  actions: {
    fetchCourse: async ({ commit }, params) => {
      try {
        const course = await Courses.getById(params.courseId);
        if (!get(course, 'trainer._id')) course.trainer = { _id: '' };

        // Coachs and client admins with vendor role only see trainees from their companies on client interface
        if (!/\/ad\//.test(router.currentRoute.path)) {
          const loggedUserCompany = store.getters['main/getCompany'];
          course.trainees = course.trainees.filter(t => get(t, 'company._id') === loggedUserCompany._id);
        }

        commit('SET_COURSE', course);
      } catch (e) {
        console.error(e);
      }
    },
    resetCourse: ({ commit }) => { commit('SET_COURSE', null); },
    setSelectedTrainer: ({ commit }, params) => { commit('SET_SELECTED_TRAINER', params.trainerId); },
    setSelectedProgram: ({ commit }, params) => { commit('SET_SELECTED_PROGRAM', params.programId); },
    setSelectedCompany: ({ commit }, params) => { commit('SET_SELECTED_COMPANY', params.companyId); },
    resetFilters: ({ commit }) => {
      commit('SET_SELECTED_TRAINER', '');
      commit('SET_SELECTED_PROGRAM', '');
      commit('SET_SELECTED_COMPANY', '');
    },
  },
  getters: {},
};