Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    primaryDisabled: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    confirm() {
      if (this.data.primaryDisabled) return
      this.triggerEvent('confirm')
    },

    dismiss() {
      this.triggerEvent('dismiss')
    },

    preventTouchMove() {}
  }
})
