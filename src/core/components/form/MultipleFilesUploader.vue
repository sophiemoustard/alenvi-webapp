<template>
  <div>
    <template v-if="documents.length === 0">
      <div class="row gutter-profile">
        <div class="flex-1">
          <ni-file-uploader :path="path" :alt="alt" @uploaded="documentUploaded" :name="name" :extensions="extensions"
            :user-profile="userProfile" :url="url" @delete="deleteDocument($event)" :caption="caption" :multiple="true"
            :additional-value="additionalFieldsName" label="Choisir un document" :drive-storage="driveStorage" />
        </div>
      </div>
    </template>
    <template v-if="documents && documents.length > 0">
      <div class="row" v-if="caption">
        <p class="input-caption">{{ caption }}</p>
      </div>
      <div class="row gutter-profile">
        <template v-for="(certificate, index) in documents">
          <div class="flex-1" :key="index">
            <div v-if="certificate.driveId" class="justify-between row" style="background: white">
              <div class="doc-thumbnail">
                <ni-custom-img :image-source="certificate.driveId" :key="certificate.driveId" :alt="alt"
                  :drive-storage="driveStorage" />
              </div>
              <div class="self-end doc-delete">
                <q-btn color="primary" round flat icon="delete" size="1rem"
                  @click.native="deleteDocument(certificate.driveId)" />
                <q-btn color="primary" round flat icon="save_alt" size="1rem"
                  @click.native="goToUrl(certificate.link)" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
    <template v-if="documents && documents.length > 0">
      <div class="row gutter-profile">
        <q-expansion-item v-model="collapsibleOpened" :label="collapsibleLabel" :expand-icon="collapsibleIcon"
          class="flex-1">
          <ni-file-uploader :path="path" :alt="alt" @uploaded="documentUploaded" :name="name" :extensions="extensions"
            :user-profile="userProfile" :url="url" @delete="deleteDocument($event)" :caption="caption" :multiple="true"
            :additional-value="additionalFieldsName" label="Choisir un document" :drive-storage="driveStorage" />
        </q-expansion-item>
      </div>
    </template>
  </div>
</template>

<script>
import { openURL } from 'quasar';
import get from 'lodash/get';
import CustomImg from '@components/form/CustomImg';
import FileUploader from '@components/form/FileUploader';
import { NotifyNegative } from '@components/popup/notify';

export default {
  name: 'MultipleFilesUploader',
  components: {
    'ni-custom-img': CustomImg,
    'ni-file-uploader': FileUploader,
  },
  props: {
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    path: { type: String, default: '' },
    alt: { type: String, default: '' },
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    additionalFieldsName: { type: String, default: '' },
    userProfile: { type: Object, default: () => ({}) },
    collapsibleLabel: { type: String, default: '' },
    extensions: { type: String, default: '' },
    driveStorage: { type: Boolean, default: false },
  },
  data () {
    return {
      collapsibleOpened: false,
    };
  },
  computed: {
    collapsibleIcon () {
      return !this.collapsibleOpened ? 'add' : 'mdi-close';
    },
    documents () {
      return get(this.userProfile, this.path) || [];
    },
  },
  methods: {
    deleteDocument (documentId) {
      this.$emit('delete', documentId);
    },
    documentUploaded (file) {
      this.$emit('uploaded');
    },
    failMsg () {
      NotifyNegative('Echec de l\'envoi du document.');
    },
    goToUrl (url) {
      url = `${url}?usp=sharing`;
      openURL(url);
    },
  },
};
</script>

<style lang="stylus" scoped>
  .doc-thumbnail
    padding: 13px 0px 40px 12px

  .doc-delete
    padding: 0px 14px 17px 0px
    .q-btn
      @media screen and (max-width: 767px)
        margin: 0px 5px

  /deep/ .q-item__section--side
    .q-icon
      size: 1em
      color: $primary
</style>
