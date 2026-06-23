  const updateProfile = (updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates }
      if (user) {
        localStorage.setItem(`dhanmitra_profile_${user.id}`, JSON.stringify(next))
      }
      return next
    })
  }
