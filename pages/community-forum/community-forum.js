const { COMMUNITY_PAGE_STATUS } = require('../../constants/community')
const { loadCommunityPosts } = require('../../services/community-resource-service')

Page({
  data: { pageStatus: COMMUNITY_PAGE_STATUS.LOADING, posts: [], errorMessage: '' },
  onLoad() { this.loadPosts() },
  async loadPosts() {
    this.setData({ pageStatus: COMMUNITY_PAGE_STATUS.LOADING, posts: [], errorMessage: '' })
    try {
      const result = await loadCommunityPosts()
      this.setData({ pageStatus: result.status, posts: result.items, errorMessage: result.errorMessage || '' })
    } catch (error) {
      this.setData({ pageStatus: COMMUNITY_PAGE_STATUS.ERROR, posts: [], errorMessage: '校园分享加载失败，请稍后重试' })
    }
  },
  retryLoad() { this.loadPosts() }
})
