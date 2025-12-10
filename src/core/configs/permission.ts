import {
  PermissionMap,
  Area,
  PermissionKey,
  Permission,
  Field
} from '../types/Permission'

export class PermissionsService {
  private static _instance: PermissionsService

  private mapping: PermissionMap = [
    {
      name: 'permission',
      keys: [
        {
          key: 'no-access',
          operations: []
        },
        {
          key: 'full',
          operations: ['permission-manager', 'domain-list-all']
        }
      ]
    },
    {
      name: 'person',
      keys: [
        {
          key: 'no-access',
          operations: []
        },
        {
          key: 'read',
          operations: ['person-search', 'person-read']
        },
        {
          key: 'read+write_ex_delete',
          operations: [
            'person-search',
            'person-read',
            'person-create',
            'person-update'
          ]
        },
        {
          key: 'full',
          operations: [
            'person-search',
            'person-read',
            'person-create',
            'person-update',
            'person-delete'
          ]
        }
      ]
    },
    {
      name: 'record',
      keys: [
        {
          key: 'no-access',
          operations: []
        },
        {
          key: 'read',
          operations: [
            'domain-read',
            'domain-read-salt',
            'domain-list-all',
            'record-read',
            'record-read-batch',
            'complete-view',
            'link-pseudonyms'
          ]
        },
        {
          key: 'read+write_ex_delete',
          operations: [
            'domain-read',
            'domain-read-salt',
            'domain-list-all',
            'record-read',
            'record-read-batch',
            'complete-view',
            'link-pseudonyms',
            'record-update-batch',
            'record-update-complete',
            'record-update',
            'domain-create',
            'domain-create-complete',
            'domain-update',
            'domain-update-complete',
            'domain-update-salt',
            'record-create',
            'record-create-batch'
          ]
        },
        {
          key: 'full',
          operations: [
            'domain-read',
            'domain-read-salt',
            'domain-list-all',
            'record-read',
            'record-read-batch',
            'complete-view',
            'link-pseudonyms',
            'record-update-batch',
            'record-update-complete',
            'record-update',
            'domain-create',
            'domain-create-complete',
            'domain-update',
            'domain-update-complete',
            'domain-update-salt',
            'record-create',
            'record-create-batch',
            'domain-delete',
            'record-delete',
            'record-delete-batch'
          ]
        }
      ]
    }
  ]

  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Retrieve the singleton instance of PermissionsService
   */
  public static instance(): PermissionsService {
    if (!PermissionsService._instance) {
      PermissionsService._instance = new PermissionsService()
    }
    return PermissionsService._instance
  }

  public getFieldByArea(area: Area): Field {
    const areaConfig = this.mapping.find((a) => a.name === area)
    if (!areaConfig) {
      throw new Error(`Area ${area} not found in permission mapping`)
    }
    return areaConfig
  }

  public getDropDownOptionsByArea(
    area: Area
  ): { label: string; value: PermissionKey }[] {
    const field = this.getFieldByArea(area)
    return field.keys.map((keyMapping) => ({
      label: keyMapping.key,
      value: keyMapping.key as PermissionKey
    }))
  }

  public getOperations(area: Area, key: PermissionKey): string[] {
    const field = this.getFieldByArea(area)
    const keyMapping = field.keys.find((k) => k.key === key)
    if (!keyMapping) {
      throw new Error(`Key ${key} not found in area ${area}`)
    }
    return keyMapping.operations
  }

  public createPermissionRequestList(
    userId: string,
    permissionRequest: Record<string, Record<string, string>>
  ): Permission[] {
    const requestList: Permission[] = []
    Object.entries(permissionRequest).forEach(([area, domains]) => {
      Object.entries(domains).forEach(([domainName, accessKey]) => {
        if (accessKey !== 'no-access') {
          this.getOperations(area as Area, accessKey as PermissionKey).forEach(
            (operation) => {
              requestList.push({
                userId,
                operation,
                domain: domainName
              })
            }
          )
        }
      })
    })

    // Deduplicate by userId, operation, and domain
    const dedupedList = Array.from(
      new Map(
        requestList.map((item) => [
          `${item.userId}|${item.operation}|${item.domain}`,
          item
        ])
      ).values()
    )

    return dedupedList
  }

  public getPermittedArea(
    expectedArea: Area,
    permissions: Permission[],
    domain: string
  ): Field {
    // Find the area config from the mapping

    let areaConfig: Field
    try {
      areaConfig = this.getFieldByArea(expectedArea)
    } catch (error) {
      console.log(error)
      // Area not found, return default no-access
      return {
        name: expectedArea,
        keys: [
          {
            key: 'no-access',
            operations: []
          }
        ]
      }
    }

    // Find the best matching key for the given permissions and domain
    // Sort keys by number of operations descending (most permissive first)
    const sortedKeys = [...areaConfig.keys].sort(
      (a, b) => b.operations.length - a.operations.length
    )

    if (permissions.length > 0) {
      for (const keyConfig of sortedKeys) {
        // Check if all operations for this key are present in the user's permissions for the domain
        const hasAllOps = keyConfig.operations.every((op) =>
          permissions.some((p) => p.domain === domain && p.operation === op)
        )
        if (hasAllOps) {
          // Return only this key for the area
          return {
            name: areaConfig.name,
            keys: [
              {
                key: keyConfig.key,
                operations: keyConfig.operations
              }
            ]
          }
        }
      }
    }

    // No match found, return no-access for this area
    return {
      name: areaConfig.name,
      keys: [
        {
          key: 'no-access',
          operations: []
        }
      ]
    }
  }
}
