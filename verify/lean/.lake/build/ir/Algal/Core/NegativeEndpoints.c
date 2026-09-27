// Lean compiler output
// Module: Algal.Core.NegativeEndpoints
// Imports: public import Init public meta import Init public import Algal.Core.RoundingEndpoints
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
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_value(uint64_t);
lean_object* lp_algalVerification_Algal_Core_RoundingInterval_midpoint(lean_object*, lean_object*);
static lean_once_cell_t lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0;
static lean_once_cell_t lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1;
static lean_once_cell_t lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2_once = LEAN_ONCE_CELL_INITIALIZER;
static lean_object* lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower;
static lean_object* _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0(void){
_start:
{
uint64_t v___x_1_; lean_object* v___x_2_; 
v___x_1_ = 9218868437227405310ULL;
v___x_2_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v___x_1_);
return v___x_2_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1(void){
_start:
{
uint64_t v___x_3_; lean_object* v___x_4_; 
v___x_3_ = 9218868437227405311ULL;
v___x_4_ = lp_algalVerification_Algal_Core_RoundingInterval_value(v___x_3_);
return v___x_4_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2(void){
_start:
{
lean_object* v___x_5_; lean_object* v___x_6_; lean_object* v___x_7_; 
v___x_5_ = lean_obj_once(&lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1, &lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1_once, _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__1);
v___x_6_ = lean_obj_once(&lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0, &lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0_once, _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__0);
v___x_7_ = lp_algalVerification_Algal_Core_RoundingInterval_midpoint(v___x_6_, v___x_5_);
return v___x_7_;
}
}
static lean_object* _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower(void){
_start:
{
lean_object* v___x_8_; 
v___x_8_ = lean_obj_once(&lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2, &lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2_once, _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower___closed__2);
return v___x_8_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_RoundingEndpoints(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_NegativeEndpoints(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_RoundingEndpoints(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower = _init_lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower();
lean_mark_persistent(lp_algalVerification_Algal_Core_NegativeEndpoints_maximumLower);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
