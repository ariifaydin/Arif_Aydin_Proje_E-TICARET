from typing import List, Optional, Literal
from pydantic import BaseModel, Field
import uuid
import datetime

ProductCategory = Literal["motor", "turbo", "sanziman", "fren", "elektrik", "aksesuar", "diger"]

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: ProductCategory
    price: float
    stock: int
    brand: str
    compatible_vehicles: List[str] = []
    image_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class ProductCreate(BaseModel):
    title: str
    description: str
    category: ProductCategory
    price: float
    stock: int
    brand: str
    compatible_vehicles: List[str] = []
    image_url: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    title: str
    price: float
    quantity: int = 1
    image_url: Optional[str] = None

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[CartItem] = []
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class OrderItem(BaseModel):
    product_id: str
    title: str
    price: float
    quantity: int

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    items: List[OrderItem]
    total_amount: float
    status: Literal["alindi", "hazirlaniyor", "kargoda", "tamamlandi", "iptal"] = "alindi"
    shipping_address: str
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class OrderCreate(BaseModel):
    shipping_address: str
