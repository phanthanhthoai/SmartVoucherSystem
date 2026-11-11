from django.conf import settings
from django.db import migrations
from decimal import Decimal, InvalidOperation


def seed_product_catalog(apps, schema_editor):
    Product = apps.get_model("orders", "Product")
    for product_id, product in settings.PRODUCT_CATALOG.items():
        if not isinstance(product, dict):
            raise ValueError(f"Catalog entry {product_id} must be a JSON object.")

        name = product.get("name")
        product_type = product.get("product_type")
        unit_price = product.get("unit_price")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"Catalog entry {product_id} must have a non-empty name.")
        if not isinstance(product_type, str) or not product_type.strip():
            raise ValueError(
                f"Catalog entry {product_id} must have a non-empty product_type."
            )
        if unit_price is None:
            raise ValueError(f"Catalog entry {product_id} must have a unit_price.")
        try:
            price = Decimal(str(unit_price))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError(
                f"Catalog entry {product_id} must have a valid unit_price."
            ) from exc
        if not price.is_finite() or price < 0:
            raise ValueError(
                f"Catalog entry {product_id} must have a non-negative unit_price."
            )

        Product.objects.using(schema_editor.connection.alias).update_or_create(
            id=int(product_id),
            defaults={
                "name": name.strip(),
                "description": product.get("description", ""),
                "product_type": product_type.strip(),
                "unit_price": price,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_product"),
    ]

    operations = [
        migrations.RunPython(seed_product_catalog, migrations.RunPython.noop),
    ]
