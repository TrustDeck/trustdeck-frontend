class GroupService {
  static async searchGroup(group: string): Promise<any> {
    // Simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: `Found group: ${group}` })
      }, 1000)
    })
  }
}

export default GroupService
