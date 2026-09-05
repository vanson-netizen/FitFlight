Component({
  properties: {
    visible: { type: Boolean, value: false },
    loading: { type: Boolean, value: false }
  },
  methods: {
    confirm() { if (!this.data.loading) this.triggerEvent('confirm') },
    dismiss() { if (!this.data.loading) this.triggerEvent('dismiss') },
    preventTouchMove() {}
  }
})
