terraform {
  required_version = ">= 1.5.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "oci" {
  region = var.region
}

# ---------- Network ----------

resource "oci_core_vcn" "gmaos" {
  compartment_id = var.compartment_id
  display_name   = "gmaos-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "gmaos"
}

resource "oci_core_internet_gateway" "gmaos" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gmaos.id
  display_name   = "gmaos-igw"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gmaos.id
  display_name   = "gmaos-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.gmaos.id
  }
}

resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.gmaos.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "gmaos-public-subnet"
  dns_label         = "pub"
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.gmaos.id]
}

# ---------- Security ----------

resource "oci_core_security_list" "gmaos" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.gmaos.id
  display_name   = "gmaos-security-list"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
    stateless   = false
  }

  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol  = "6"
    source    = "0.0.0.0/0"
    stateless = false
    tcp_options {
      min = 443
      max = 443
    }
  }
}

# ---------- Compute ----------

data "oci_core_images" "ubuntu" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "gmaos" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = "gmaos-${var.environment}"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "gmaos-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data = base64encode(templatefile("${path.module}/cloud-init.yaml", {
      site_domain    = var.site_domain
      compose_branch = var.compose_branch
      repo_url       = var.repo_url
    }))
  }

  freeform_tags = {
    "project"     = "gmaos"
    "environment" = var.environment
    "managed_by"  = "terraform"
  }
}

# ---------- Block Volume ----------

resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_id
  availability_domain = var.availability_domain
  display_name        = "gmaos-data-${var.environment}"
  size_in_gbs         = var.data_volume_gb

  freeform_tags = {
    "project"     = "gmaos"
    "environment" = var.environment
  }
}

resource "oci_core_volume_attachment" "data" {
  instance_id     = oci_core_instance.gmaos.id
  volume_id       = oci_core_volume.data.id
  attachment_type = "paravirtualized"
  display_name    = "gmaos-data-attach"
}
