# Entity-Relationship Diagram (ERD) — UMKM Business Assistant

## Visual Diagram (Mermaid)

```mermaid
erDiagram
    User ||--o{ Membership : "memiliki"
    Organization ||--o{ Membership : "memiliki"
    Organization ||--o{ MemberInvite : "mengundang"
    Organization ||--o{ Category : "memiliki"
    Organization ||--o{ Product : "memiliki"
    Category ||--o{ Product : "mengelompokkan"
    Organization ||--o{ InventoryMovement : "mencatat"
    Product ||--o{ InventoryMovement : "memiliki riwayat"
    Organization ||--o{ Customer : "memiliki"
    Organization ||--o{ Supplier : "memiliki"
    Organization ||--o{ Sale : "memiliki"
    Customer ||--o{ Sale : "melakukan"
    Sale ||--|{ SaleItem : "berisi"
    Product ||--o{ SaleItem : "menjadi item"
    Organization ||--o{ ExpenseCategory : "memiliki"
    Organization ||--o{ Expense : "mencatat"
    ExpenseCategory ||--o{ Expense : "mengelompokkan"
    Organization ||--o{ Notification : "menerima"
    Organization ||--o{ AuditLog : "mencatat"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        datetime createdAt
    }

    Organization {
        string id PK
        string name
        string slug UK
        string currency
        string timezone
        decimal taxRate
        decimal discountRate
        int minStockThreshold
        boolean allowNegativeStock
    }

    Membership {
        string id PK
        string userId FK
        string organizationId FK
        string role "OWNER, ADMIN, MANAGER, STAFF"
        boolean isActive
    }

    Product {
        string id PK
        string organizationId FK
        string categoryId FK
        string sku "Unique per Org"
        string name
        string unit
        decimal costPrice
        decimal sellingPrice
        int currentStock
        int minStock
        boolean isActive
        datetime deletedAt
    }

    InventoryMovement {
        string id PK
        string organizationId FK
        string productId FK
        string type "INITIAL, PURCHASE, SALE, ADJUSTMENT, RETURN, LOSS"
        int quantity
        int stockBefore
        int stockAfter
        string reason
        datetime performedAt
    }

    Sale {
        string id PK
        string organizationId FK
        string transactionNo "Unique per Org"
        string customerId FK
        string status "COMPLETED, CANCELLED, REFUNDED"
        string paymentMethod "CASH, TRANSFER, QRIS"
        decimal subtotal
        decimal discountAmount
        decimal taxAmount
        decimal total
        string idempotencyKey UK
        datetime soldAt
    }

    SaleItem {
        string id PK
        string saleId FK
        string productId FK
        string productName "Snapshot"
        string productSku "Snapshot"
        decimal costPriceSnapshot "Snapshot HPP"
        decimal unitPriceSnapshot "Snapshot Harga Jual"
        int quantity
        decimal discountAmount
        decimal subtotal
    }

    Expense {
        string id PK
        string organizationId FK
        string categoryId FK
        decimal amount
        string paymentMethod
        string description
        datetime expenseDate
    }

    AuditLog {
        string id PK
        string organizationId FK
        string userId FK
        string action
        string resourceType
        string resourceId
        json metadata
        datetime createdAt
    }
```

## Aturan Integritas Data & Relasi:

1. **Multi-Tenancy**: Setiap entitas bisnis memiliki kolom `organizationId` dengan Foreign Key ke tabel `Organization` (`onDelete: Cascade`).
2. **SKU Scope**: SKU unik per organisasi dengan constraint `@@unique([organizationId, sku])`.
3. **No Float for Money**: Seluruh nilai moneter (`costPrice`, `sellingPrice`, `subtotal`, `taxAmount`, `total`, `amount`) menggunakan tipe PostgreSQL `Decimal(15, 2)`.
4. **Historical Price Stability**: Tabel `SaleItem` menyimpan snapshot `costPriceSnapshot` dan `unitPriceSnapshot`. Jika produk di kemudian hari diubah harga modal atau harga jualnya, transaksi lampau dan laba kotor riil tidak akan berubah.
5. **Inventory Immutability**: Tabel `InventoryMovement` tidak memiliki kolom `updatedAt` maupun `deletedAt`. Data riwayat stok tidak dapat dimanipulasi secara diam-diam.
