model User {
  id_user           Int                   @id @default(autoincrement())
  first_name        String
  last_name         String
  email             String                @unique
  password          String
  address           String?
  phone             String?
  role              String                @default("client")
  created_at        DateTime              @default(now())
  is_deleted        Boolean               @default(false)
  
  // Relations
  orders            Order[]               @relation("UserOrders")
  cart              Cart[]                @relation("UserCart")
  productReviews    ProductReview[]       @relation("UserProductReviews")
  wishlist          Wishlist[]            @relation("UserWishlist")
  supportMessages   CustomerSupportMessage[] @relation("UserSupportMessages")
  administrator     Administrator?        @relation("UserAdministrator")

  @@map("user") // Si tu souhaites spécifier un nom de table dans la base de données
}
