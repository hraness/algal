// Lean compiler output
// Module: Algal.Core.SignedRounding
// Imports: public import Init public meta import Init public import Algal.Core.RoundingInterval
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lp_algalVerification_Algal_Core_BinaryValue_signBit(uint64_t);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
lean_object* lean_uint64_to_nat(uint64_t);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint64_t lean_uint64_of_nat(lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_SignedRounding_half___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_SignedRounding_half___closed__0;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_SignedRounding_half;
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_SignedRounding_negateBits(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_SignedRounding_negateBits___boxed(lean_object*);
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_SignedRounding_negate(uint64_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_SignedRounding_negate___boxed(lean_object*);
static lean_object* _init_lp_algalVerification_Algal_Core_SignedRounding_half___closed__0(void){
_start:
{
lean_object* v___x_1_; 
v___x_1_ = lean_cstr_to_nat("9223372036854775808");
return v___x_1_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_SignedRounding_half(void){
_start:
{
lean_object* v___x_2_; 
v___x_2_ = lean_obj_once(&lp_algalVerification_Algal_Core_SignedRounding_half___closed__0, &lp_algalVerification_Algal_Core_SignedRounding_half___closed__0_once, _init_lp_algalVerification_Algal_Core_SignedRounding_half___closed__0);
return v___x_2_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_SignedRounding_negateBits(uint64_t v_bits_3_){
_start:
{
lean_object* v___x_4_; lean_object* v___x_5_; uint8_t v___x_6_; 
v___x_4_ = lp_algalVerification_Algal_Core_BinaryValue_signBit(v_bits_3_);
v___x_5_ = lean_unsigned_to_nat(0u);
v___x_6_ = lean_nat_dec_eq(v___x_4_, v___x_5_);
lean_dec(v___x_4_);
if (v___x_6_ == 0)
{
lean_object* v___x_7_; lean_object* v___x_8_; lean_object* v___x_9_; uint64_t v___x_10_; 
v___x_7_ = lean_uint64_to_nat(v_bits_3_);
v___x_8_ = lean_obj_once(&lp_algalVerification_Algal_Core_SignedRounding_half___closed__0, &lp_algalVerification_Algal_Core_SignedRounding_half___closed__0_once, _init_lp_algalVerification_Algal_Core_SignedRounding_half___closed__0);
v___x_9_ = lean_nat_sub(v___x_7_, v___x_8_);
lean_dec(v___x_7_);
v___x_10_ = lean_uint64_of_nat(v___x_9_);
lean_dec(v___x_9_);
return v___x_10_;
}
else
{
lean_object* v___x_11_; lean_object* v___x_12_; lean_object* v___x_13_; uint64_t v___x_14_; 
v___x_11_ = lean_uint64_to_nat(v_bits_3_);
v___x_12_ = lean_obj_once(&lp_algalVerification_Algal_Core_SignedRounding_half___closed__0, &lp_algalVerification_Algal_Core_SignedRounding_half___closed__0_once, _init_lp_algalVerification_Algal_Core_SignedRounding_half___closed__0);
v___x_13_ = lean_nat_add(v___x_11_, v___x_12_);
lean_dec(v___x_11_);
v___x_14_ = lean_uint64_of_nat(v___x_13_);
lean_dec(v___x_13_);
return v___x_14_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_SignedRounding_negateBits___boxed(lean_object* v_bits_15_){
_start:
{
uint64_t v_bits_boxed_16_; uint64_t v_res_17_; lean_object* v_r_18_; 
v_bits_boxed_16_ = lean_unbox_uint64(v_bits_15_);
lean_dec_ref(v_bits_15_);
v_res_17_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v_bits_boxed_16_);
v_r_18_ = lean_box_uint64(v_res_17_);
return v_r_18_;
}
}
LEAN_EXPORT uint64_t lp_algalVerification_Algal_Core_SignedRounding_negate(uint64_t v_n_19_){
_start:
{
uint64_t v___x_20_; 
v___x_20_ = lp_algalVerification_Algal_Core_SignedRounding_negateBits(v_n_19_);
return v___x_20_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_SignedRounding_negate___boxed(lean_object* v_n_21_){
_start:
{
uint64_t v_n_boxed_22_; uint64_t v_res_23_; lean_object* v_r_24_; 
v_n_boxed_22_ = lean_unbox_uint64(v_n_21_);
lean_dec_ref(v_n_21_);
v_res_23_ = lp_algalVerification_Algal_Core_SignedRounding_negate(v_n_boxed_22_);
v_r_24_ = lean_box_uint64(v_res_23_);
return v_r_24_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RoundingInterval(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_SignedRounding(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_RoundingInterval(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_SignedRounding_half = _init_lp_algalVerification_Algal_Core_SignedRounding_half();
lean_mark_persistent(lp_algalVerification_Algal_Core_SignedRounding_half);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
