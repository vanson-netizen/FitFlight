Component({
  properties: {
    visible: { type: Boolean, value: false },
    type: { type: String, value: 'initial' },
    loading: { type: Boolean, value: false }
  },

  methods: {
    confirm() {
      if (!this.data.loading) this.triggerEvent('confirm')
    },
    defer() {
      if (!this.data.loading) this.triggerEvent('defer')
    },
    preventTouchMove() {}
  }
})
