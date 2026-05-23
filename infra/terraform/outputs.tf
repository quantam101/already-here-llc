output "instance_public_ip" {
  description = "Public IP address of the GMAOS compute instance"
  value       = oci_core_instance.gmaos.public_ip
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.gmaos.id
}

output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.gmaos.id
}

output "subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.public.id
}

output "data_volume_id" {
  description = "OCID of the persistent data volume"
  value       = oci_core_volume.data.id
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh ubuntu@${oci_core_instance.gmaos.public_ip}"
}
