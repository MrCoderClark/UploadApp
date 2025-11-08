# Organization & Team Management

Complete organization and team management system with role-based access control (RBAC).

## Features

✅ Organization CRUD operations  
✅ Team member invitations  
✅ Role-based access control (Owner, Admin, Member, Guest)  
✅ Permission system  
✅ Organization switching  
✅ Member management (add/remove/update roles)  
✅ Audit logging  
✅ Soft delete support  

## Roles & Permissions

### Role Hierarchy

1. **OWNER** - Full control
   - All permissions
   - Can delete organization
   - Can manage all members
   - Cannot be removed if they're the last owner

2. **ADMIN** - Administrative access
   - Can invite/remove members
   - Can update organization settings
   - Can manage member roles (except Owner)
   - Cannot delete organization

3. **MEMBER** - Standard access
   - Can view organization
   - Can view members
   - Limited permissions

4. **GUEST** - Read-only access
   - Can view organization
   - Cannot modify anything

## API Endpoints

### Create Organization

**POST** `/api/v1/organizations`

Creates a new organization. The creator automatically becomes the owner.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Acme Inc",
  "slug": "acme-inc",
  "description": "Our awesome company"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "Acme Inc",
      "slug": "acme-inc",
      "description": "Our awesome company",
      "plan": "FREE",
      "createdAt": "2025-11-08T...",
      "members": [
        {
          "id": "uuid",
          "role": "OWNER",
          "user": {
            "id": "uuid",
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      ]
    }
  }
}
```

**Validation:**
- `name`: Required, 1-100 characters
- `slug`: Required, 3-50 characters, lowercase letters/numbers/hyphens only
- `description`: Optional, max 500 characters

---

### Get User's Organizations

**GET** `/api/v1/organizations`

Returns all organizations the user is a member of.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "uuid",
        "name": "Acme Inc",
        "slug": "acme-inc",
        "plan": "FREE",
        "members": [...]
      }
    ]
  }
}
```

---

### Get Organization by ID

**GET** `/api/v1/organizations/:id`

Get details of a specific organization.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "Acme Inc",
      "slug": "acme-inc",
      "description": "Our awesome company",
      "avatar": null,
      "website": null,
      "plan": "FREE",
      "createdAt": "2025-11-08T...",
      "members": [...]
    }
  }
}
```

---

### Update Organization

**PATCH** `/api/v1/organizations/:id`

Update organization details. Requires OWNER or ADMIN role.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "description": "Updated description",
  "avatar": "https://example.com/avatar.png",
  "website": "https://acme.com"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "uuid",
      "name": "Acme Corporation",
      ...
    }
  }
}
```

---

### Delete Organization

**DELETE** `/api/v1/organizations/:id`

Soft delete an organization. Only OWNER can delete.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

---

### Get Organization Members

**GET** `/api/v1/organizations/:id/members`

Get all members of an organization.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "role": "OWNER",
        "invitedAt": "2025-11-08T...",
        "acceptedAt": "2025-11-08T...",
        "user": {
          "id": "uuid",
          "email": "owner@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "avatar": null
        }
      },
      {
        "id": "uuid",
        "role": "MEMBER",
        "invitedBy": "uuid",
        "invitedAt": "2025-11-08T...",
        "acceptedAt": "2025-11-08T...",
        "user": {
          "id": "uuid",
          "email": "member@example.com",
          "firstName": "Jane",
          "lastName": "Smith"
        }
      }
    ]
  }
}
```

---

### Invite Member

**POST** `/api/v1/organizations/:id/members`

Invite a user to the organization. Requires OWNER or ADMIN role.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "email": "newmember@example.com",
  "role": "MEMBER"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "uuid",
      "role": "MEMBER",
      "invitedBy": "uuid",
      "invitedAt": "2025-11-08T...",
      "acceptedAt": "2025-11-08T...",
      "user": {
        "id": "uuid",
        "email": "newmember@example.com",
        "firstName": "New",
        "lastName": "Member"
      }
    }
  }
}
```

**Roles:**
- `OWNER`
- `ADMIN`
- `MEMBER`
- `GUEST`

---

### Update Member Role

**PATCH** `/api/v1/organizations/:id/members/:userId`

Update a member's role. Requires OWNER or ADMIN role.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "uuid",
      "role": "ADMIN",
      "user": {...}
    }
  }
}
```

**Restrictions:**
- Cannot change the role of the last OWNER
- ADMIN cannot change OWNER roles

---

### Remove Member

**DELETE** `/api/v1/organizations/:id/members/:userId`

Remove a member from the organization. Requires OWNER or ADMIN role.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Restrictions:**
- Cannot remove the last OWNER
- Must be OWNER or ADMIN to remove members

---

## Testing with Postman

### 1. Create Organization

```
POST http://localhost:4000/api/v1/organizations
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "My Company",
  "slug": "my-company",
  "description": "A great company"
}
```

### 2. Get Your Organizations

```
GET http://localhost:4000/api/v1/organizations
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 3. Invite a Member

```
POST http://localhost:4000/api/v1/organizations/ORG_ID/members
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "email": "teammate@example.com",
  "role": "MEMBER"
}
```

### 4. Update Member Role

```
PATCH http://localhost:4000/api/v1/organizations/ORG_ID/members/USER_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "role": "ADMIN"
}
```

### 5. Get Organization Members

```
GET http://localhost:4000/api/v1/organizations/ORG_ID/members
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## Error Handling

### Organization Not Found
```json
{
  "success": false,
  "error": {
    "message": "You are not a member of this organization"
  }
}
```

### Slug Already Taken
```json
{
  "success": false,
  "error": {
    "message": "Organization slug is already taken"
  }
}
```

### Insufficient Permissions
```json
{
  "success": false,
  "error": {
    "message": "You do not have permission to perform this action"
  }
}
```

### Cannot Remove Last Owner
```json
{
  "success": false,
  "error": {
    "message": "Cannot remove the last owner"
  }
}
```

### User Already Member
```json
{
  "success": false,
  "error": {
    "message": "User is already a member of this organization"
  }
}
```

---

## Use Cases

### 1. Create Company Workspace

```javascript
// User creates their company
const org = await createOrganization({
  name: "Acme Inc",
  slug: "acme-inc",
  description: "Our company workspace"
});
// User is automatically OWNER
```

### 2. Invite Team Members

```javascript
// Owner/Admin invites team
await inviteMember(orgId, {
  email: "developer@acme.com",
  role: "MEMBER"
});

await inviteMember(orgId, {
  email: "manager@acme.com",
  role: "ADMIN"
});
```

### 3. Promote Member to Admin

```javascript
// Owner promotes member
await updateMemberRole(orgId, userId, {
  role: "ADMIN"
});
```

### 4. Organization Switching

```javascript
// Get all user's organizations
const orgs = await getUserOrganizations();

// Switch to different org
const currentOrg = await getOrganizationById(orgs[1].id);
```

---

## Security Features

1. **Permission Checks** - Every action validates user role
2. **Audit Logging** - All organization actions are logged
3. **Last Owner Protection** - Cannot remove/demote the last owner
4. **Soft Delete** - Organizations are soft-deleted, not permanently removed
5. **Member Validation** - Users must exist before being invited

---

## Database Schema

```prisma
model Organization {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  avatar      String?
  website     String?
  plan        OrganizationPlan @default(FREE)
  members     OrganizationMember[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

model OrganizationMember {
  id             String   @id @default(uuid())
  organizationId String
  userId         String
  role           OrganizationRole
  invitedBy      String?
  invitedAt      DateTime?
  acceptedAt     DateTime?
  organization   Organization @relation(...)
  user           User @relation(...)
  
  @@unique([organizationId, userId])
}

enum OrganizationRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}
```

---

## Testing Checklist

- [ ] Create organization as authenticated user
- [ ] Get list of user's organizations
- [ ] Get organization details
- [ ] Update organization (as OWNER/ADMIN)
- [ ] Invite member to organization
- [ ] Update member role
- [ ] Remove member from organization
- [ ] Try to remove last owner (should fail)
- [ ] Try to perform admin action as MEMBER (should fail)
- [ ] Delete organization (as OWNER)
- [ ] Check audit logs in database
