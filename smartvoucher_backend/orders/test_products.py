import tempfile
from io import BytesIO
from pathlib import Path

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from .serializers import ProductSerializer


class ProductImageTests(TestCase):
    def test_product_image_upload_is_saved_and_returned(self):
        image_buffer = BytesIO()
        Image.new("RGB", (1, 1), color="red").save(image_buffer, format="PNG")

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                serializer = ProductSerializer(data={
                    "name": "Image product",
                    "description": "",
                    "product_type": "drink",
                    "unit_price": "1000.00",
                    "image": SimpleUploadedFile(
                        "product.png",
                        image_buffer.getvalue(),
                        content_type="image/png",
                    ),
                })

                self.assertTrue(serializer.is_valid(), serializer.errors)
                product = serializer.save()

                self.assertTrue(Path(product.image.path).is_file())
                self.assertTrue(serializer.data["image"].startswith("/media/products/"))
