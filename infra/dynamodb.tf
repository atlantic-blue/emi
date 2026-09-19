# One table holds the whole vault. An account item is ACC#<accountId> / META and a record item is
# ACC#<accountId> / REC#<recordId>, so one account's items sit in one partition and a pull reads
# them in one query.
#
# The table is ciphertext and metadata. It never holds a date, a symptom, a flow or a note, which
# is contract TABLE-4 and the reason the product exists. The attribute rules are proved in feature
# 6 step 3, against a written item.
resource "aws_dynamodb_table" "vault" {
  name = "${var.project_name}-vault"

  # On demand, so an idle table bills for storage and nothing else.
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "updatedAt"
    type = "S"
  }

  # A pull asks for everything one account wrote after a cursor. The cursor is a write time, so
  # the index sorts on the write time and the query is one read rather than a scan.
  local_secondary_index {
    name            = "byUpdated"
    range_key       = "updatedAt"
    projection_type = "ALL"
  }

  # A deleted record keeps a headstone for 30 days so a second phone learns of the delete before
  # the row disappears underneath it.
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  # Her vault cannot be removed by a configuration change alone. Deleting it takes a person
  # turning this off first, on purpose.
  deletion_protection_enabled = true
}

# The article catalogue, which is public writing about a cycle phase. It is a second table rather
# than a second partition of the vault, because the function that reads it stands behind no
# authorizer: one that could reach the vault table would be one mistake away from her partition.
#
# Nothing here names a reader. There is no read count, no last read instant and no rating, because
# each one would be a place to write down who read what.
resource "aws_dynamodb_table" "articles" {
  name = "${var.project_name}-articles"

  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }
}
